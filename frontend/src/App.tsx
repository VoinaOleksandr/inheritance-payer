import { useState, useEffect } from "react";
import { useWallet, useFhevm, useInheritance } from "./hooks";
import {
  Layout,
  ConnectWallet,
  HeirDashboard,
  ExecutorDashboard,
  LoadingState,
} from "./components";
import { EstateSelector } from "./components/EstateSelector";
import { CreateEstateModal } from "./components/CreateEstateModal";
import { WelcomeScreen } from "./components/WelcomeScreen";
import "./styles/global.css";

function App() {
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    // Multi-estate state
    myExecutorEstates,
    myHeirEstates,
    selectedEstateId,
    currentEstate,
    currentRole,
    // Estate-specific data
    heirs,
    myAllocation,
    hasClaimed,
    // Loading/error
    isLoading,
    error: inheritanceError,
    // Estate management
    selectEstate,
    createEstate,
    // Estate operations
    addHeir,
    removeHeir,
    finalizeEstate,
    claimAllocation,
    decryptMyAllocation,
    getHeirAllocation,
    checkHeirClaimed,
    // Token operations
    mintTokens,
    setDistributionAsOperator,
    depositTokens,
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

  const hasEstates = myExecutorEstates.length > 0 || myHeirEstates.length > 0;

  const handleCreateEstate = async (name: string): Promise<number> => {
    const estateId = await createEstate(name);
    selectEstate(estateId);
    return estateId;
  };

  // Main app with sidebar layout
  return (
    <Layout address={address} onDisconnect={disconnect}>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <EstateSelector
            executorEstates={myExecutorEstates}
            heirEstates={myHeirEstates}
            selectedId={selectedEstateId}
            onSelect={selectEstate}
            onCreate={() => setShowCreateModal(true)}
          />
        </aside>

        {/* Main content */}
        <main className="main-content">
          {inheritanceError && (
            <div className="error-banner">{inheritanceError}</div>
          )}

          {selectedEstateId === null ? (
            <WelcomeScreen
              hasEstates={hasEstates}
              onCreate={() => setShowCreateModal(true)}
            />
          ) : isLoading && !currentEstate ? (
            <LoadingState message="Loading estate..." />
          ) : currentEstate && currentRole === "executor" ? (
            <ExecutorDashboard
              estateInfo={currentEstate}
              heirs={heirs}
              isLoading={isLoading}
              onAddHeir={addHeir}
              onRemoveHeir={removeHeir}
              onFinalize={finalizeEstate}
              onMintTokens={mintTokens}
              onSetupOperator={setDistributionAsOperator}
              onDepositTokens={depositTokens}
              onGetHeirAllocation={getHeirAllocation}
              onCheckClaimed={checkHeirClaimed}
            />
          ) : currentEstate && currentRole === "heir" ? (
            <HeirDashboard
              estateInfo={currentEstate}
              heirCount={heirs.length}
              myAllocation={myAllocation}
              hasClaimed={hasClaimed}
              isLoading={isLoading}
              onDecryptAllocation={decryptMyAllocation}
              onClaim={claimAllocation}
            />
          ) : currentEstate ? (
            <div className="container">
              <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
                <h2>Access Denied</h2>
                <p className="text-secondary mt-4">
                  You are not an executor or heir of this estate.
                </p>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Create estate modal */}
      <CreateEstateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateEstate}
      />
    </Layout>
  );
}

export default App;
