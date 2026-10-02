"use client";

import React, { useState } from "react";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import EmiCalculatorSection from "@/components/calculator/EmiCalculatorSection";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

export default function CalculatorPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="visitor-page emi-calculator-page">
      {/* 1. Header Navigation */}
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      {/* 2. Main EMI Calculator Component (Banner + Filters + Bank Cards + Tool) */}
      <main>
        <EmiCalculatorSection />
      </main>

      {/* 3. Footer */}
      <FooterSection />

      {/* 4. Find Car Modal */}
      <FindCarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
