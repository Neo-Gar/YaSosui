module sui_escrow_factory::escrow_factory {
    use sui::object::{UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::hash::{Self, keccak256};
    use sui::event;
    use sui::clock::{Clock};
    use std::vector;
    use sui::sui::SUI;

    // ===== Errors =====
    const EInvalidSecret: u64 = 0;
    const EInsufficientBalance: u64 = 2;

    // ===== Structs =====
    
    /// Escrow object that holds funds and order details
    public struct Escrow has key, store {
        id: UID,
        order_hash: vector<u8>,
        hash_lock: vector<u8>,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        time_locks: vector<u8>,
        deployed_at: u64,
        is_withdrawn: bool,
        is_cancelled: bool,
    }

    /// Escrow factory that manages escrow deployments
    public struct EscrowFactory has key {
        id: UID,
        escrow_count: u64,
    }

    /// Capability for managing escrow factory
    public struct EscrowFactoryCap has key {
        id: UID,
    }

    // ===== Events =====
    
    public struct EscrowCreated has copy, drop {
        order_hash: vector<u8>,
        escrow_id: address,
        maker: address,
        taker: address,
        amount: u64,
        deployed_at: u64,
    }

    public struct EscrowWithdrawn has copy, drop {
        order_hash: vector<u8>,
        escrow_id: address,
        taker: address,
        amount: u64,
    }

    public struct EscrowCancelled has copy, drop {
        order_hash: vector<u8>,
        escrow_id: address,
        maker: address,
        amount: u64,
    }

    // ===== Functions =====

    /// Initialize the escrow factory
    fun init(ctx: &mut TxContext) {
        let factory = EscrowFactory {
            id: object::new(ctx),
            escrow_count: 0,
        };
        
        let cap = EscrowFactoryCap {
            id: object::new(ctx),
        };
        
        transfer::share_object(factory);
        transfer::transfer(cap, tx_context::sender(ctx));
    }

    /// Deploy a new escrow
    public entry fun deploy_escrow(
        factory: &mut EscrowFactory,
        order_hash: vector<u8>,
        hash_lock: vector<u8>,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        time_locks: vector<u8>,
        // payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let escrow = Escrow {
            id: object::new(ctx),
            order_hash,
            hash_lock,
            maker,
            taker,  
            token,
            amount,
            safety_deposit,
            time_locks,
            deployed_at: tx_context::epoch(ctx),
            is_withdrawn: false,
            is_cancelled: false,
        };

        factory.escrow_count = factory.escrow_count + 1;

        // Emit event
        event::emit(EscrowCreated {
            order_hash: escrow.order_hash,
            escrow_id: escrow.id.to_address(),
            maker: escrow.maker,
            taker: escrow.taker,
            amount: escrow.amount,
            deployed_at: escrow.deployed_at,
        });
        
        // Share the escrow object
        transfer::share_object(escrow);
        

    }

    /// Withdraw funds from escrow using secret
    public entry fun withdraw(
        mut escrow: Escrow,
        secret: vector<u8>,
        _ctx: &mut TxContext
    ) {
        // Check if already withdrawn or cancelled
        assert!(!escrow.is_withdrawn, EInvalidSecret);
        assert!(!escrow.is_cancelled, EInvalidSecret);
        
        // Verify secret matches hash lock
        let secret_hash = hash::keccak256(&secret);
        assert!(secret_hash == escrow.hash_lock, EInvalidSecret);
        
        // Mark as withdrawn
        escrow.is_withdrawn = true;

        event::emit(EscrowWithdrawn {
            order_hash: escrow.order_hash,
            escrow_id: escrow.id.to_address(),
            taker: escrow.taker,
            amount: escrow.amount,
        });
        
        // Delete escrow after withdrawal
        let Escrow { id, .. } = escrow;
        object::delete(id);
    }

    /// Cancel escrow (only maker can cancel)
    public entry fun cancel_escrow(
        mut escrow: Escrow,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.is_withdrawn, EInsufficientBalance);
        assert!(!escrow.is_cancelled, EInsufficientBalance);

        escrow.is_cancelled = true;

        event::emit(EscrowCancelled {
            order_hash: escrow.order_hash,
            escrow_id: escrow.id.to_address(),
            maker: escrow.maker,
            amount: escrow.amount,
        });
        
        // Delete escrow after cancellation
        let Escrow { id, .. } = escrow;
        object::delete(id);
    }

    /// Get escrow count
    public fun get_escrow_count(factory: &EscrowFactory): u64 {
        factory.escrow_count
    }

    /// Get escrow details
    public fun get_escrow_details(escrow: &Escrow): (vector<u8>, vector<u8>, address, address, address, u64, u64, vector<u8>, u64, bool, bool) {
        (
            escrow.order_hash,
            escrow.hash_lock,
            escrow.maker,
            escrow.taker,
            escrow.token,
            escrow.amount,
            escrow.safety_deposit,
            escrow.time_locks,
            escrow.deployed_at,
            escrow.is_withdrawn,
            escrow.is_cancelled
        )
    }
} 