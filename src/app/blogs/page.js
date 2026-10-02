"use client";

import React, { useState } from "react";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import BlogsSection from "@/components/blogs/BlogsSection";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

export default function BlogsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="visitor-page blogs-page">
      {/* 1. Header Navigation */}
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      {/* 2. Main Blogs Section */}
      <main>
        <BlogsSection />
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
