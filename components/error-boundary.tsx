"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-black/80 backdrop-blur-xl rounded-xl shadow-2xl p-8 border border-white/10 text-center space-y-6">
              {/* Error Icon */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  <span className="gradient-text">Oops!</span> Something went wrong
                </h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  {this.state.error?.message || "An unexpected error occurred. Please try refreshing the page."}
                </p>
              </div>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="text-left">
                  <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                    Error Details
                  </summary>
                  <pre className="mt-2 p-3 bg-white/5 rounded-lg text-xs text-white/60 overflow-x-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleReset} variant="glow" className="shadow-lg">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try again
                </Button>
                <Button variant="glass" onClick={() => window.location.reload()} className="hover:border-purple-400/50">
                  Reload page
                </Button>
              </div>

              {/* Home Link */}
              <Link
                href="/dashboard"
                className="inline-flex items-center text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                <Home className="w-4 h-4 mr-1" />
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
