"use client";

import React, { useState } from "react";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import FaqPageSection from "@/components/faq/FaqPageSection";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

export default function FaqPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="visitor-page faq-page">
      {/* 1. Header Navigation */}
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      {/* 2. Main FAQ Section */}
      <main>
        <FaqPageSection />
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
