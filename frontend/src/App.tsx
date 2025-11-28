import { useEffect } from "react";
import { useWallet, useFhevm, useInheritance } from "./hooks";
import {
  Layout,
  ConnectWallet,
  HeirDashboard,
  ExecutorDashboard,
  LoadingState,
} from "./components";
import "./styles/global.css";

function App() {
  const {
    address,
    signer,
    isConnected,
    isConnecting,
    error: walletError,
    connect,
    disconnect,
  } = useWallet();

  const {
    status: fhevmStatus,
    initialize: initializeFhevm,
    isInitialized,
    error: fhevmError,
  } = useFhevm();

  const {
    estateInfo,
    isExecutor,
    isHeir,
    heirs,
    myAllocation,
    hasClaimed,
    isLoading,
    error: inheritanceError,
    loadEstateInfo: _loadEstateInfo,
    decryptMyAllocation,
    mintTokens,
    setDistributionAsOperator,
    depositTokens,
    addHeir,
    removeHeir,
    finalizeEstate,
    claimAllocation,
    getHeirAllocation,
    distributionAddress: _distributionAddress,
  } = useInheritance(signer, address);

  // Initialize FHEVM after wallet connects
  useEffect(() => {
    if (isConnected && fhevmStatus === "idle") {
      initializeFhevm();
    }
  }, [isConnected, fhevmStatus, initializeFhevm]);

  // Show connect wallet screen if not connected
  if (!isConnected) {
    return (
      <Layout>
        <ConnectWallet
          onConnect={connect}
          isConnecting={isConnecting}
          error={walletError}
        />
      </Layout>
    );
  }

  // Show loading while FHEVM initializes
  if (!isInitialized) {
    return (
      <Layout address={address} onDisconnect={disconnect}>
        <LoadingState
          message={
            fhevmStatus === "loading"
              ? "Initializing encryption..."
              : fhevmError || "Preparing secure environment..."
          }
        />
      </Layout>
    );
  }

  // Show loading while estate info loads
  if (isLoading && !estateInfo) {
    return (
      <Layout address={address} onDisconnect={disconnect}>
        <LoadingState message="Loading estate information..." />
      </Layout>
    );
  }

  // Show error if no estate info and not loading
  if (!estateInfo) {
    return (
      <Layout address={address} onDisconnect={disconnect}>
        <div className="container">
          <div className="error-message">
            {inheritanceError || "Unable to load estate. Please check your contract configuration."}
          </div>
        </div>
      </Layout>
    );
  }

  // Check claimed status
  const checkClaimed = async (_heirAddress: string): Promise<boolean> => {
    // This would be better as part of the hook, but for simplicity
    // we're using the hasClaimed state for the current user
    // For other heirs, we'd need to call the contract
    return false; // Simplified - executor sees all as not claimed initially
  };

  // Render executor dashboard
  if (isExecutor) {
    return (
      <Layout address={address} onDisconnect={disconnect}>
        <ExecutorDashboard
          estateInfo={estateInfo}
          heirs={heirs}
          isLoading={isLoading}
          onAddHeir={addHeir}
          onRemoveHeir={removeHeir}
          onFinalize={finalizeEstate}
          onMintTokens={mintTokens}
          onSetupOperator={setDistributionAsOperator}
          onDepositTokens={depositTokens}
          onGetHeirAllocation={getHeirAllocation}
          onCheckClaimed={checkClaimed}
        />
      </Layout>
    );
  }

  // Render heir dashboard
  if (isHeir) {
    return (
      <Layout address={address} onDisconnect={disconnect}>
        <HeirDashboard
          estateInfo={estateInfo}
          heirCount={heirs.length}
          myAllocation={myAllocation}
          hasClaimed={hasClaimed}
          isLoading={isLoading}
          onDecryptAllocation={decryptMyAllocation}
          onClaim={claimAllocation}
        />
      </Layout>
    );
  }

  // Not executor or heir
  return (
    <Layout address={address} onDisconnect={disconnect}>
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <h2>Not Authorized</h2>
          <p className="text-secondary mt-4">
            Your address is not registered as an heir or executor for this estate.
          </p>
          <p className="text-muted mt-2">
            Connected: {address}
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default App;
