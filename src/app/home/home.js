"use client";

import React, { useState } from "react";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import HeroSection from "@/components/home/HeroSection";
import EligibilitySection from "@/components/home/EligibilitySection";
import BrandSection from "@/components/home/BrandSection";
import WhyChooseSection from "@/components/home/WhyChooseSection";
import AssistanceSection from "@/components/home/AssistanceSection";
import FaqSection from "@/components/home/FaqSection";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRank, setModalRank] = useState("");
  const [modalBrand, setModalBrand] = useState("");

  const handleOpenModal = (options = {}) => {
    setModalRank(options.rank || "");
    setModalBrand(options.brand || "");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalRank("");
    setModalBrand("");
  };

  return (
    <div className="visitor-page">
      {/* Visitor Navbar */}
      <VisitorNavbar onOpenSearch={() => handleOpenModal()} />

      {/* Main Content Sections */}
      <main>
        {/* Section 1: Hero Section  */}
        <HeroSection onOpenModal={handleOpenModal} />

        {/* Section 2: CSD Car Eligibility  */}
        <EligibilitySection onOpenModal={handleOpenModal} />

        {/* Section 3: Choose Your Car Brand for CSD Price */}
        <BrandSection onOpenModal={handleOpenModal} />

        {/* Section 4: Why Choose CSD Car Purchase in India */}
        <WhyChooseSection />

        {/* Section 5: Confused About Buying a Car Through CSD */}
        <AssistanceSection />

        {/* Section 6: Frequently Asked Questions (FAQ Section) */}
        <FaqSection />
      </main>

      {/* Section 7: Footer Section */}
      <FooterSection />

      {/* Custom Reusable "Find Your Perfect Car" Modal  */}
      <FindCarModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialRank={modalRank}
        initialBrand={modalBrand}
      />
    </div>
  );
}
