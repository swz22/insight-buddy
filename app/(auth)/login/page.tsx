import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-cyan-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/2 w-80 h-80 bg-blue-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Logo/Brand */}
      <div className="absolute top-8 left-8">
        <h1 className="text-2xl font-bold font-display">
          <span className="text-white">Insight</span> <span className="gradient-text">Buddy</span>
        </h1>
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <LoginForm />
      </div>
    </div>
  );
}
