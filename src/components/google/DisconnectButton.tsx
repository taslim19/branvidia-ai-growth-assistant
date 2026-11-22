"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export function DisconnectButton({
  onDisconnect,
  loading,
}: {
  onDisconnect: () => Promise<void>;
  loading?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onDisconnect();
      setConfirmOpen(false);
      showToast("Google disconnected");
    } catch (e) {
      // Stay in the modal and say what happened; no success toast on failure.
      setError(e instanceof Error ? e.message : "Disconnect didn’t complete. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setConfirmOpen(true)} loading={loading}>
        Disconnect Google
      </Button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Disconnect Google?">
        <p className="text-base text-slate">
          Branvidia stops reading your profile right away. Reports you already saved stay on this
          device. You can reconnect any time.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Keep connected
          </Button>
          <Button variant="primary" onClick={() => void confirm()} loading={busy || loading}>
            Disconnect
          </Button>
        </div>
      </Modal>
    </>
  );
}
