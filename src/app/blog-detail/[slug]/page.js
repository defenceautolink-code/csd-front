"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import "@/app/visitor.css";
import VisitorNavbar from "@/components/visitornavbar";
import BlogDetailSection from "@/components/blogs/BlogDetailSection";
import FooterSection from "@/components/home/FooterSection";
import FindCarModal from "@/components/FindCarModal";

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params?.slug;
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="visitor-page blog-detail-page">
      {/* 1. Header Navigation */}
      <VisitorNavbar onOpenSearch={() => setIsModalOpen(true)} />

      {/* 2. Main Blog Detail Section */}
      <main>
        <BlogDetailSection slug={slug} />
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
