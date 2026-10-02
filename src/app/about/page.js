"use client";

import React, { useState } from "react";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import AboutSection from "@/components/about/AboutSection";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

export default function AboutPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="visitor-page about-page">
      {/* 1. Header Navigation */}
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      {/* 2. Main About Section */}
      <main>
        <AboutSection />
      </main>

      {/* 3. Footer */}
      <FooterSection />

      {/* 4. Find Car Search Modal */}
      <FindCarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
