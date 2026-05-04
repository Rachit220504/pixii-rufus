"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Sparkles, Shield, Zap, ArrowRight, CheckCircle, Menu, X } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

export function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/chat");
    }
  }, [router]);

  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-amazon-dark dark:text-amazon-orange" />,
      title: "AI-Powered Recommendations",
      description: "Get personalized product recommendations based on real customer reviews",
    },
    {
      icon: <Shield className="w-6 h-6 text-amazon-dark dark:text-amazon-orange" />,
      title: "Review Analysis",
      description: "We analyze thousands of reviews to extract pros, cons, and hidden insights",
    },
    {
      icon: <Zap className="w-6 h-6 text-amazon-dark dark:text-amazon-orange" />,
      title: "Instant Answers",
      description: "Ask any shopping question and get structured answers in seconds",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Online Shopper",
      content: "Rufus helped me find the perfect magnesium supplement for my mom. The review analysis is incredible!",
    },
    {
      name: "Michael Chen",
      role: "Tech Enthusiast",
      content: "Finally, an AI that understands what I need in a mechanical keyboard. Saved me hours of research.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amazon-orange rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amazon-dark" />
              </div>
              <span className="font-bold text-xl text-amazon-dark dark:text-white">Rufus AI</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={() => router.push("/login")}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="bg-amazon-dark text-white px-4 py-2 rounded-lg font-medium hover:bg-amazon-light transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    router.push("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    router.push("/signup");
                    setMobileMenuOpen(false);
                  }}
                  className="bg-amazon-dark text-white px-4 py-2 rounded-lg font-medium hover:bg-amazon-light transition-colors w-full"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-amazon-orange/10 dark:bg-amazon-orange/20 text-amazon-dark dark:text-amazon-orange px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              Powered by Google Gemini AI
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight">
              Your AI Shopping Assistant{" "}
              <span className="text-amazon-blue">for Amazon</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 px-2 sm:px-0">
              Ask questions like "Best magnesium supplement for seniors" and get 
              personalized recommendations backed by real customer reviews.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <button
                onClick={() => router.push("/signup")}
                className="bg-amazon-orange text-amazon-dark px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-amazon-orange/90 transition-colors flex items-center justify-center gap-2"
              >
                Try Rufus Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => router.push("/login")}
                className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">How Rufus Works</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2 sm:px-0">
              Our AI analyzes thousands of Amazon reviews to give you the best recommendations
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amazon-orange/20 rounded-xl flex items-center justify-center text-amazon-dark mb-3 sm:mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                Get Recommendations in 3 Simple Steps
              </h2>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amazon-blue text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Ask Your Question</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Type what you're looking for in natural language</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amazon-blue text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">AI Analysis</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Our AI searches and analyzes thousands of reviews</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amazon-blue text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Get Results</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Receive structured recommendations with pros, cons, and comparisons</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-amazon-dark rounded-xl sm:rounded-2xl p-4 sm:p-8 text-white mt-4 sm:mt-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-300 mb-1 sm:mb-2">You ask:</p>
                  <p className="text-sm sm:text-base">"Best magnesium supplement for seniors with sensitive stomach?"</p>
                </div>
                <div className="bg-amazon-orange/20 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-amazon-orange mb-2">Rufus analyzes 2,847 reviews...</p>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      <span>Best Overall: Nature Made Magnesium</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      <span>Best Budget: Sundown Magnesium</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      <span>Best for Sensitive Stomach: Magnesium Glycinate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 dark:bg-gray-800 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8 sm:mb-12">
            What Users Say
          </h2>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{testimonial.name}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Ready to Find Your Perfect Product?
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 px-2 sm:px-0">
            Join thousands of shoppers using Rufus to make better buying decisions
          </p>
          <button
            onClick={() => router.push("/signup")}
            className="bg-amazon-dark text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-amazon-light transition-colors inline-flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="font-bold text-white text-sm sm:text-base">Rufus AI Shopper</span>
            </div>
            <p className="text-xs sm:text-sm text-center sm:text-left">© 2026 Rufus AI Shopper. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
