"use client";

import React, { useState } from "react";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import ContactSection from "@/components/contact/ContactSection";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

export default function ContactPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="visitor-page contact-page">
      {/* 1. Header Navigation */}
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      {/* 2. Main Contact Section */}
      <main>
        <ContactSection />
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
