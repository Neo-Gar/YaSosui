// Real anvil server setup using Foundry configuration from packages/solidity
const { spawn } = require('child_process')
const { promisify } = require('util')
const { exec } = require('child_process')
const execAsync = promisify(exec)

class AnvilServer {
    constructor(port = 8545, forkUrl = null, chainId = 31337) {
        this.port = port
        // @ts-ignore
        this.forkUrl = forkUrl
        this.chainId = chainId
        this.process = null
        this.url = `http://localhost:${port}`
    }

    async start() {
        const args = [
            '--port', this.port.toString(),
            '--chain-id', this.chainId.toString()
        ]

        if (this.forkUrl) {
            args.push('--fork-url', this.forkUrl)
        }

        // Use anvil from the Solidity package's Foundry installation
        const anvilPath = require('path').join(__dirname, '../../../packages/solidity')

        this.process = spawn('anvil', args, {
            cwd: anvilPath,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        })

        // Wait for server to be ready
        await this.waitForServer()

        return {
            url: this.url,
            close: () => this.stop()
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForServer() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Anvil server startup timeout'))
            }, 10000)

            if (this.process) {
                this.process.stdout.on('data', (data) => {
                    const output = data.toString()
                    if (output.includes('Listening on') || output.includes('RPC Server running')) {
                        clearTimeout(timeout)
                        resolve()
                    }
                })

                this.process.stderr.on('data', (data) => {
                    const output = data.toString()
                    if (output.includes('error') || output.includes('Error')) {
                        clearTimeout(timeout)
                        reject(new Error(`Anvil startup error: ${output}`))
                    }
                })

                this.process.on('error', (error) => {
                    clearTimeout(timeout)
                    reject(error)
                })
            }
        })
    }

    async stop() {
        if (this.process) {
            this.process.kill('SIGTERM')
            this.process = null
        }
    }

    address() {
        return {
            address: 'localhost',
            port: this.port
        }
    }
}

const createServer = jest.fn((config) => {
    const { instance } = config
    const server = new AnvilServer(
        instance.port || 8545,
        instance.forkUrl,
        instance.chainId || 31337
    )

    return server
})

/**
 * @param {Object} config
 * @param {number} [config.port]
 * @param {number} [config.chainId]
 * @param {string} [config.forkUrl]
 */
const anvil = (config = {}) => ({
    name: 'anvil',
    port: config.port || 8545,
    chainId: config.chainId || 31337,
    forkUrl: config.forkUrl,
    command: ['anvil', '--port', (config.port || 8545).toString(), '--chain-id', (config.chainId || 31337).toString()]
})

// Export for ES modules
const moduleExports = {
    createServer,
    instances: {
        anvil
    }
}

module.exports = moduleExports 