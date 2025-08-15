import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Save, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface HuggingFaceConfigProps {
  onSave?: (apiKey: string) => void;
  className?: string;
}

export function HuggingFaceConfig({ onSave, className }: HuggingFaceConfigProps) {
  const toast = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsValidating(true);
    setIsValid(null);

    try {
      const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "Test input for validation",
        }),
      });

      if (response.status === 401 || response.status === 403) {
        setIsValid(false);
        toast.error("Invalid API key");
      } else if (response.ok || response.status === 503) {
        setIsValid(true);
        toast.success("API key validated successfully!");
      } else {
        throw new Error("Validation failed");
      }
    } catch (error) {
      console.error("Validation error:", error);
      setIsValid(false);
      toast.error("Failed to validate API key");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Please validate your API key first");
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(apiKey);
      }
      toast.success("Hugging Face configuration saved!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
            <img src="/huggingface-logo.svg" alt="Hugging Face" className="w-5 h-5" />
          </div>
          Hugging Face Configuration
        </CardTitle>
        <CardDescription>Configure your Hugging Face API key for AI-powered summaries and insights</CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-6">
        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="text-yellow-100">Free tier includes 30,000 API calls per month</p>
              <p className="text-yellow-200/80">Used for generating meeting summaries, action items, and insights</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsValid(null);
                }}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={cn(
                  "pr-10 font-mono",
                  isValid === true && "border-green-500/50",
                  isValid === false && "border-red-500/50"
                )}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4 text-white/60" /> : <Eye className="w-4 h-4 text-white/60" />}
              </button>
            </div>
            <p className="text-xs text-white/60">
              Get your API key from{" "}
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 underline inline-flex items-center gap-1"
              >
                Hugging Face Settings
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={validateApiKey}
              disabled={!apiKey.trim() || isValidating}
              className={cn("flex-1", isValid === true && "border-green-500/50 text-green-400 hover:text-green-300")}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : isValid === true ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validated
                </>
              ) : (
                "Validate Key"
              )}
            </Button>

            <Button onClick={handleSave} disabled={!isValid || isSaving} className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-white/90">What&apos;s included:</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5" />
              <span>AI-powered meeting summaries with key points and decisions</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5" />
              <span>Automatic action item extraction with priority levels</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5" />
              <span>Speaker sentiment analysis and engagement metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5" />
              <span>Meeting dynamics and key moment detection</span>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-sm text-blue-200">
            <strong>Pro tip:</strong> The free tier is perfect for personal use and small teams. Upgrade to a paid plan
            for higher limits and faster processing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
