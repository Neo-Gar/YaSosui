import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getTokenInfo } from "@/lib/constants/tokens";

const orderInputSchema = z.object({
  fromTokenKey: z.string(),
  fromNetwork: z.enum(["ethereum", "sui"]),
  toTokenKey: z.string(),
  toNetwork: z.enum(["ethereum", "sui"]),
  totalAmount: z.number().positive(),
  signature: z.string().optional(),
  orderHash: z.string().optional(),
  secrets: z.string().optional(), // Store as JSON string
  jsonOrder: z.string().optional(), // Store as JSON string
});

const ordersQuerySchema = z.object({
  status: z
    .enum(["all", "active", "completed", "expired"])
    .optional()
    .default("all"),
  sortBy: z
    .enum([
      "newest",
      "oldest",
      "amount-high",
      "amount-low",
      "progress-high",
      "progress-low",
    ])
    .optional()
    .default("newest"),
  limit: z.number().min(1).max(50).optional().default(10),
  cursor: z.string().optional(),
});

export const ordersRouter = createTRPCRouter({
  create: publicProcedure
    .input(orderInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if tokens are available in specified networks
      getTokenInfo(input.fromTokenKey as any, input.fromNetwork);
      getTokenInfo(input.toTokenKey as any, input.toNetwork);

      // Create order with expiration in one hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const order = await ctx.db.order.create({
        data: {
          fromTokenKey: input.fromTokenKey,
          fromNetwork: input.fromNetwork,
          toTokenKey: input.toTokenKey,
          toNetwork: input.toNetwork,
          totalAmount: input.totalAmount,
          signature: input.signature,
          orderHash: input.orderHash,
          secrets: input.secrets,
          jsonOrder: input.jsonOrder,
          expiresAt,
        },
      });

      return order;
    }),

  getAll: publicProcedure
    .input(ordersQuerySchema)
    .query(async ({ ctx, input }) => {
      const { status, sortBy, limit, cursor } = input;

      // Basic filtering conditions
      const where: any = {};

      if (status !== "all") {
        if (status === "expired") {
          where.expiresAt = {
            lt: new Date(),
          };
        } else {
          where.status = status;
        }
      }

      // Define sorting order
      let orderBy: any = {};
      switch (sortBy) {
        case "newest":
          orderBy.createdAt = "desc";
          break;
        case "oldest":
          orderBy.createdAt = "asc";
          break;
        case "amount-high":
          orderBy.totalAmount = "desc";
          break;
        case "amount-low":
          orderBy.totalAmount = "asc";
          break;
        case "progress-high":
          orderBy.collectedAmount = "desc";
          break;
        case "progress-low":
          orderBy.collectedAmount = "asc";
          break;
      }

      // Get orders with pagination
      const orders = await ctx.db.order.findMany({
        where,
        orderBy,
        take: limit + 1, // Take one more to determine next cursor
        cursor: cursor ? { id: cursor } : undefined,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (orders.length > limit) {
        const nextItem = orders.pop();
        nextCursor = nextItem!.id;
      }

      // Enrich orders with token information
      const ordersWithTokens = orders.map((order) => {
        const fromToken = getTokenInfo(
          order.fromTokenKey as any,
          order.fromNetwork as any,
        );
        const toToken = getTokenInfo(
          order.toTokenKey as any,
          order.toNetwork as any,
        );

        return {
          ...order,
          fromToken,
          toToken,
        };
      });

      return {
        items: ordersWithTokens,
        nextCursor,
      };
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["active", "completed", "cancelled", "expired"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return order;
    }),

  updateCollectedAmount: publicProcedure
    .input(
      z.object({
        id: z.string(),
        collectedAmount: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First get the current order
      const currentOrder = await ctx.db.order.findUnique({
        where: { id: input.id },
      });

      if (!currentOrder) {
        throw new Error("Order not found");
      }

      // Define new status
      const newStatus =
        input.collectedAmount >= currentOrder.totalAmount
          ? "completed"
          : "active";

      const order = await ctx.db.order.update({
        where: { id: input.id },
        data: {
          collectedAmount: input.collectedAmount,
          status: newStatus,
        },
      });

      return order;
    }),
});
