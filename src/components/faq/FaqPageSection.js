"use client";

import React from "react";
import Link from "next/link";
import FaqSection from "@/components/home/FaqSection";

export default function FaqPageSection() {
  return (
    <div className="faq-page-wrapper">
      {/* 1. Hero Banner with car key image */}
      <section className="faq-banner">
        <div className="container">
          <h1 className="faq-banner-title">
            Frequently Asked Questions
          </h1>
          <nav className="faq-breadcrumb" aria-label="breadcrumb">
            <Link href="/">Home</Link>
            <span>-</span>
            <span>Faq</span>
          </nav>
        </div>
      </section>

      {/* 2. Questions & Answers Section using Home Faq Component */}
      <div className="faq-content-area">
        <FaqSection hideTitle={true} initialOpen={null} />
      </div>
    </div>
  );
}
