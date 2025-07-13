import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, className = "", ...props }) => (
  <button
    className={`w-full bg-gradient-to-r from-[#4F7EF7] to-[#6B92F9] text-white font-semibold rounded-lg px-6 py-3 shadow transition hover:from-[#3B5EE5] hover:to-[#4F7EF7] focus:outline-none focus:ring-2 focus:ring-[#4F7EF7] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);
