"use client";

import * as React from "react";
import { Camera, ImagePlus, Loader2, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useHousehold } from "@/lib/hooks/use-household";
import { toast } from "sonner";

interface ReceiptUploadProps {
  /** Stored as the value to write to transactions.receipt_url (storage path within bucket). */
  value: string | null;
  onChange: (path: string | null) => void;
}

export function ReceiptUpload({ value, onChange }: ReceiptUploadProps) {
  const supabase = createClient();
  const { data: hh } = useHousehold();
  const [busy, setBusy] = React.useState(false);
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  // Resolve signed URL for preview when path exists.
  React.useEffect(() => {
    let alive = true;
    if (!value) {
      setSignedUrl(null);
      return;
    }
    (async () => {
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(value, 60 * 60);
      if (alive) setSignedUrl(data?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [value, supabase]);

  const upload = async (file: File) => {
    if (!hh) return toast.error("No household");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10 MB");
    setBusy(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${hh.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("receipts").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange(path);
    toast.success("Receipt added");
  };

  const remove = async () => {
    if (!value) return;
    setBusy(true);
    const { error } = await supabase.storage.from("receipts").remove([value]);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange(null);
  };

  const isPdf = value?.toLowerCase().endsWith(".pdf");

  if (value && signedUrl) {
    return (
      <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
        {isPdf ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-3 text-sm hover:bg-accent"
          >
            <FileText className="h-5 w-5 text-muted-foreground" />
            View receipt (PDF)
          </a>
        ) : (
          <a href={signedUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt="Receipt"
              className="w-full max-h-64 object-contain bg-background"
            />
          </a>
        )}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={remove}
          disabled={busy}
          aria-label="Remove receipt"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12"
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Take photo
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-12"
        onClick={() => galleryRef.current?.click()}
        disabled={busy}
      >
        <ImagePlus className="h-4 w-4" />
        Choose file
      </Button>
    </div>
  );
}

/** Hook for read-only preview of a stored path. */
export function useReceiptUrl(path: string | null) {
  const supabase = createClient();
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    (async () => {
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(path, 60 * 60);
      if (alive) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [path, supabase]);
  return url;
}
