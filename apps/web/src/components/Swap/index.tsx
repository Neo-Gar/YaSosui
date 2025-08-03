"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useState, useEffect, useRef } from "react";
import TokenInfo from "./TokenInfo";
import SwapInfo from "./SwapInfo";
import { TokenLogo } from "../TokenLogo";
import { api } from "@/trpc/react";
import { type IToken } from "@/lib/types/IToken";
import {
  getAvailableTokensForNetwork,
  getTokensFromDifferentNetwork,
  NETWORKS,
} from "@/lib/constants/tokens";
import { useSwapOrder } from "@/lib/hooks/SwapOrder";
import { parseEther } from "ethers";
import PendingOrderModal from "../PendingOrderModal";
import { useWallets } from "@/lib/hooks/useWallets";

const SwapSchema = Yup.object().shape({
  fromAmount: Yup.number()
    .positive("Amount must be positive")
    .required("Enter amount to send")
    .min(0.001, "Minimum amount is 0.001"),
});

export default function Swap() {
  const router = useRouter();
  const { activeWallet } = useWallets();

  // Get available tokens for each network
  const ethereumTokens = getAvailableTokensForNetwork("ethereum");
  const suiTokens = getAvailableTokensForNetwork("sui");

  const convertToIToken = (token: any): IToken => ({
    symbol: token.symbol,
    name: token.name,
    logo: token.logo,
    address: token.address,
    network: token.network,
  });

  const [fromToken, setFromToken] = useState<IToken>(
    convertToIToken(ethereumTokens[0]!),
  );
  const [toToken, setToToken] = useState<IToken>(
    convertToIToken(suiTokens[0]!),
  );
  const [showFromTokenList, setShowFromTokenList] = useState<boolean>(false);
  const [showToTokenList, setShowToTokenList] = useState<boolean>(false);
  const [showPendingOrderModal, setShowPendingOrderModal] =
    useState<boolean>(false);
  const [pendingOrderId, setPendingOrderId] = useState<string>("");
  const { startSwapOrder } = useSwapOrder();

  const exchangeRateQuery = api.coingecko.getExchangeRate.useQuery(
    {
      fromTokenSymbol: fromToken.symbol,
      toTokenSymbol: toToken.symbol,
    },
    {
      enabled: fromToken.symbol !== toToken.symbol,
      refetchInterval: 30000,
      staleTime: 60000,
    },
  );

  const fromTokenRef = useRef<HTMLDivElement>(null);
  const toTokenRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fromTokenRef.current &&
        !fromTokenRef.current.contains(event.target as Node)
      ) {
        setShowFromTokenList(false);
      }
      if (
        toTokenRef.current &&
        !toTokenRef.current.contains(event.target as Node)
      ) {
        setShowToTokenList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter tokens by network
  const getTokensByNetwork = (network: "ethereum" | "sui") => {
    const tokens = getAvailableTokensForNetwork(network);
    return tokens.map(convertToIToken);
  };

  // Get tokens from different network
  const getTokensFromDifferentNetwork = (
    currentNetwork: "ethereum" | "sui",
  ) => {
    const targetNetwork = currentNetwork === "ethereum" ? "sui" : "ethereum";
    return getTokensByNetwork(targetNetwork);
  };

  // Handle token selection with network tracking
  const handleFromTokenChange = (
    newToken: IToken,
    setFieldValue?: (field: string, value: string) => void,
  ) => {
    setFromToken(newToken);

    // If tokens are from the same network, change toToken to different network
    if (newToken.network === toToken.network) {
      const differentNetworkTokens = getTokensFromDifferentNetwork(
        newToken.network,
      );
      if (differentNetworkTokens.length > 0) {
        setToToken(differentNetworkTokens[0]!);
        if (setFieldValue) {
          setFieldValue("toAmount", "");
        }
      }
    }
  };

  const handleToTokenChange = (
    newToken: IToken,
    setFieldValue?: (field: string, value: string) => void,
  ) => {
    setToToken(newToken);
    if (setFieldValue) {
      setFieldValue("toAmount", "");
    }
  };

  const swapTokens = (
    setFieldValue: (field: string, value: string) => void,
    values: { fromAmount: string; toAmount: string },
  ) => {
    const tempFromToken = fromToken;
    setFromToken(toToken);
    setToToken(tempFromToken);
    setFieldValue("fromAmount", values.toAmount);
    setFieldValue("toAmount", values.fromAmount);
  };

  const exchangeRate = exchangeRateQuery.data?.rate ?? 1.0;
  const isLoading = exchangeRateQuery.isLoading;
  const error = exchangeRateQuery.error;

  const createOrderMutation = api.orders.create.useMutation({
    onSuccess: (result) => {
      setShowPendingOrderModal(true);
      setPendingOrderId(result.id);
    },
  });

  const handleSubmit = async (values: {
    fromAmount: string;
    toAmount: string;
  }) => {
    if (!activeWallet) {
      alert("Please connect your wallet");
      return;
    }
    try {
      // Use token addresses directly
      const fromTokenKey = fromToken.address;
      const toTokenKey = toToken.address;

      console.log(
        "/////////////////////// Starting swap order... ///////////////////////",
      );

      const result = await startSwapOrder(
        fromTokenKey,
        toTokenKey,
        parseEther(values.fromAmount),
        parseEther(values.toAmount)
      );
      console.log(
        "/////////////////////// Swap order started! ///////////////////////",
      );

      if (!result?.data) {
        throw new Error("Failed to start swap order");
      }

      await createOrderMutation.mutateAsync({
        fromTokenKey: result.data.fromTokenKey,
        fromNetwork: result.data.fromNetwork as "ethereum" | "sui",
        toTokenKey: result.data.toTokenKey,
        toNetwork: result.data.toNetwork as "ethereum" | "sui",
        signature: result.data.signature?.[0], // Take first signature from array
        orderHash: result.data.orderHash?.[0], // Take first order hash from array
        secrets: JSON.stringify(result.data.secrets), // Convert array to JSON string
        totalAmount: parseFloat(values.fromAmount),
        jsonOrder: result.data.jsonOrder,
      });

      await new Promise((resolve) => setTimeout(resolve, 20000));
      setShowPendingOrderModal(false);

      console.log("Order created successfully!");
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  };

  // Calculate to amount based on exchange rate
  const calculateToAmount = (fromAmount: string, setFieldValue: any) => {
    if (fromAmount && !isNaN(Number(fromAmount)) && exchangeRate) {
      const toAmount = (Number(fromAmount) / exchangeRate).toFixed(6);
      setFieldValue("toAmount", toAmount);
    } else {
      setFieldValue("toAmount", "");
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto flex h-fit max-w-2xl flex-col"
      >
        {/* Back button */}
        <motion.button
          onClick={() => router.push("/")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mr-auto mb-4 cursor-pointer px-3 py-1 text-base text-gray-600 transition-colors hover:text-gray-800"
        >
          ← Back
        </motion.button>

        <h1 className="mb-4 text-3xl font-light text-black">YasoSui SWAP</h1>

        <div className="flex-1 rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-medium text-gray-800">
            Swap Tokens
          </h2>

          <Formik
            initialValues={{
              fromAmount: "",
              toAmount: "",
            }}
            validationSchema={SwapSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, isValid }) => (
              <Form className="space-y-4">
                {/* From */}
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-600">
                    You Pay
                  </label>
                  <motion.div
                    className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3"
                    whileFocus={{ borderColor: "#8F81F8" }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex-1">
                      <Field
                        name="fromAmount"
                        type="number"
                        placeholder="0.0"
                        className="w-full text-2xl font-light outline-none"
                        step="0.000001"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value;
                          setFieldValue("fromAmount", value);
                          calculateToAmount(value, setFieldValue);
                        }}
                      />
                      <ErrorMessage
                        name="fromAmount"
                        component="div"
                        className="mt-1 text-base text-red-500"
                      />
                    </div>

                    {/* Token selection */}
                    <div className="relative" ref={fromTokenRef}>
                      <motion.button
                        type="button"
                        onClick={() => setShowFromTokenList(!showFromTokenList)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-2 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 px-2 py-1.5 transition-all hover:from-blue-100 hover:to-purple-100"
                      >
                        <motion.div
                          className="h-6 w-6"
                          animate={{ rotate: showFromTokenList ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TokenLogo
                            symbol={fromToken.symbol}
                            className="h-full w-full"
                          />
                        </motion.div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {fromToken.symbol}
                          </div>
                          <div className="text-sm text-gray-500">
                            {
                              NETWORKS.find((n) => n.id === fromToken.network)
                                ?.name
                            }
                          </div>
                        </div>
                        <motion.span
                          animate={{ rotate: showFromTokenList ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-gray-400"
                        >
                          ▼
                        </motion.span>
                      </motion.button>

                      {/* Dropdown list of tokens */}
                      {showFromTokenList && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full right-0 z-20 mt-2 max-h-64 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
                        >
                          {NETWORKS.map((network) => (
                            <div key={network.id} className="mb-2">
                              <div className="mb-1 px-2 py-1 text-sm font-medium text-gray-500">
                                {network.name}
                              </div>
                              <div className="space-y-1">
                                {getTokensByNetwork(network.id).map((token) => (
                                  <TokenInfo
                                    key={token.symbol}
                                    symbol={token.symbol}
                                    name={token.name}
                                    network={network.name}
                                    isSelected={
                                      fromToken.symbol === token.symbol
                                    }
                                    onClick={() => {
                                      handleFromTokenChange(
                                        token,
                                        setFieldValue,
                                      );
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Swap arrow */}
                <div className="flex justify-center">
                  <motion.button
                    type="button"
                    onClick={() => swapTokens(setFieldValue, values)}
                    whileHover={{ rotate: 180, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </motion.button>
                </div>

                {/* To */}
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-600">
                    You Receive
                  </label>
                  <motion.div
                    className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3"
                    whileFocus={{ borderColor: "#8F81F8" }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex-1">
                      <input
                        name="toAmount"
                        type="text"
                        placeholder="0.0"
                        className="w-full bg-transparent text-2xl font-light outline-none"
                        readOnly
                        value={values.toAmount}
                      />
                    </div>

                    {/* Token selection */}
                    <div className="relative" ref={toTokenRef}>
                      <motion.button
                        type="button"
                        onClick={() => setShowToTokenList(!showToTokenList)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 px-2 py-1.5 transition-all hover:from-purple-100 hover:to-blue-100"
                      >
                        <motion.div
                          className="h-6 w-6"
                          animate={{ rotate: showToTokenList ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TokenLogo
                            symbol={toToken.symbol}
                            className="h-full w-full"
                          />
                        </motion.div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {toToken.symbol}
                          </div>
                          <div className="text-sm text-gray-500">
                            {
                              NETWORKS.find((n) => n.id === toToken.network)
                                ?.name
                            }
                          </div>
                        </div>
                        <motion.span
                          animate={{ rotate: showToTokenList ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-gray-400"
                        >
                          ▼
                        </motion.span>
                      </motion.button>

                      {/* Dropdown list of tokens */}
                      {showToTokenList && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full right-0 z-20 mt-2 max-h-64 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
                        >
                          {NETWORKS.map((network) => (
                            <div key={network.id} className="mb-2">
                              <div className="mb-1 px-2 py-1 text-sm font-medium text-gray-500">
                                {network.name}
                              </div>
                              <div className="space-y-1">
                                {getTokensByNetwork(network.id).map((token) => (
                                  <TokenInfo
                                    key={token.symbol}
                                    symbol={token.symbol}
                                    name={token.name}
                                    network={network.name}
                                    isSelected={toToken.symbol === token.symbol}
                                    onClick={() => {
                                      handleToTokenChange(token, setFieldValue);
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Swap information */}
                <SwapInfo
                  fromNetwork={
                    NETWORKS.find((n) => n.id === fromToken.network)?.name || ""
                  }
                  toNetwork={
                    NETWORKS.find((n) => n.id === toToken.network)?.name || ""
                  }
                  fromToken={fromToken.symbol}
                  toToken={toToken.symbol}
                  rate={
                    exchangeRate
                      ? `1 ${fromToken.symbol} ≈ ${(1 / exchangeRate).toFixed(6)} ${toToken.symbol}`
                      : `1 ${fromToken.symbol} ≈ 1.0 ${toToken.symbol}`
                  }
                  isLoading={isLoading}
                />

                {/* Swap button */}
                <motion.button
                  type="submit"
                  disabled={
                    !isValid ||
                    !values.fromAmount ||
                    createOrderMutation.isPending
                  }
                  whileHover={{
                    scale:
                      isValid &&
                        values.fromAmount &&
                        !createOrderMutation.isPending
                        ? 1.02
                        : 1,
                  }}
                  whileTap={{
                    scale:
                      isValid &&
                        values.fromAmount &&
                        !createOrderMutation.isPending
                        ? 0.98
                        : 1,
                  }}
                  className={`w-full rounded-lg py-3 font-medium text-white shadow-lg transition-all ${isValid &&
                    values.fromAmount &&
                    !createOrderMutation.isPending
                    ? "bg-gradient-to-r from-[#8F81F8] to-[#7C6EF8] hover:from-[#7C6EF8] hover:to-[#6B5EF7]"
                    : "cursor-not-allowed bg-gray-300"
                    }`}
                >
                  {createOrderMutation.isPending
                    ? "Creating Order..."
                    : isValid && values.fromAmount
                      ? isLoading
                        ? "Loading..."
                        : "Create Order"
                      : "Enter amount to swap"}
                </motion.button>
              </Form>
            )}
          </Formik>
        </div>
        {showPendingOrderModal && (
          <PendingOrderModal
            orderId={pendingOrderId}
            onClose={() => setShowPendingOrderModal(false)}
          />
        )}
      </motion.div>
    </div>
  );
}
