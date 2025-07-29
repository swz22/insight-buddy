"use client";

import { useState, useEffect } from "react";
import { X, Copy, Link, Lock, Clock, Trash2, Check, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ShareLink {
  id: string;
  share_token: string;
  shareUrl: string;
  hasPassword: boolean;
  expires_at: string | null;
  created_at: string;
  access_count: number;
  isExpired: boolean;
}

interface ShareDialogProps {
  meetingId: string;
  meetingTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ meetingId, meetingTitle, isOpen, onClose }: ShareDialogProps) {
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewShareForm, setShowNewShareForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<"1h" | "24h" | "7d" | "30d" | "never">("7d");

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, meetingId]);

  const fetchShares = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/share`);
      if (response.ok) {
        const data = await response.json();
        setShares(data);
      }
    } catch (error) {
      console.error("Failed to fetch shares:", error);
      toast.error("Failed to load share links");
    } finally {
      setIsLoading(false);
    }
  };

  const createShare = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password || null,
          expiresIn,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create share link");
      }

      const data = await response.json();
      toast.success("Share link created!");
      setShowNewShareForm(false);
      setPassword("");
      setExpiresIn("7d");
      await fetchShares();
    } catch (error) {
      console.error("Create share error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create share link");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteShare = async (token: string) => {
    if (!confirm("Are you sure you want to revoke this share link?")) return;

    try {
      const response = await fetch(`/api/shares/${token}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke share link");
      }

      toast.success("Share link revoked");
      await fetchShares();
    } catch (error) {
      console.error("Delete share error:", error);
      toast.error("Failed to revoke share link");
    }
  };

  const copyToClipboard = async (url: string, token: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] border border-white/10 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-semibold font-display text-white flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share <span className="gradient-text">Meeting</span>
              </h2>
              <p className="text-sm text-white/60 mt-1">{meetingTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/60 transition-colors p-1 hover:bg-white/5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Create new share */}
                {!showNewShareForm ? (
                  <Button onClick={() => setShowNewShareForm(true)} variant="glow" className="w-full shadow-lg">
                    <Link className="w-4 h-4 mr-2" />
                    Create New Share Link
                  </Button>
                ) : (
                  <div className="p-4 rounded-lg bg-white/[0.03] border border-white/20 space-y-4">
                    <h3 className="font-medium text-white/90">Create Share Link</h3>

                    <div className="space-y-2">
                      <label className="block text-sm text-white/70">Password Protection (optional)</label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave empty for no password"
                        className="bg-white/[0.03] border-white/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm text-white/70">Expiration</label>
                      <select
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 text-white focus:outline-none focus:border-purple-400/60"
                      >
                        <option value="1h">1 hour</option>
                        <option value="24h">24 hours</option>
                        <option value="7d">7 days</option>
                        <option value="30d">30 days</option>
                        <option value="never">Never</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={createShare} variant="glow" disabled={isCreating} className="flex-1">
                        {isCreating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Link"
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowNewShareForm(false);
                          setPassword("");
                          setExpiresIn("7d");
                        }}
                        variant="glass"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Existing shares */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white/70">Active Share Links</h3>

                  {shares.length === 0 ? (
                    <div className="text-center py-8 text-white/40">No share links created yet</div>
                  ) : (
                    shares.map((share) => (
                      <div
                        key={share.id}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          share.isExpired
                            ? "bg-red-500/5 border-red-500/20 opacity-60"
                            : "bg-white/[0.03] border-white/20 hover:border-white/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {share.hasPassword && <Lock className="w-4 h-4 text-yellow-400" />}
                              {share.expires_at && <Clock className="w-4 h-4 text-blue-400" />}
                              <span className="text-xs text-white/50">
                                Created {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-white/10 px-2 py-1 rounded font-mono text-white/70">
                                {share.shareUrl}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(share.shareUrl, share.share_token)}
                                className="h-7 px-2"
                              >
                                {copiedToken === share.share_token ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-white/50">
                              <span>{share.access_count} views</span>
                              {share.expires_at && (
                                <span>
                                  {share.isExpired
                                    ? "Expired"
                                    : `Expires ${formatDistanceToNow(new Date(share.expires_at), { addSuffix: true })}`}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteShare(share.share_token)}
                            className="hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
