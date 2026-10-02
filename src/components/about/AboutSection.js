"use client";

import React from "react";
import Link from "next/link";
import WhyChooseSection from "@/components/home/WhyChooseSection";

export default function AboutSection() {
  return (
    <div className="about-wrapper">
      {/* 1. Hero Banner with car key image */}
      <section className="about-banner">
        <div className="container">
          <h1 className="about-banner-title">About</h1>
          <nav className="about-breadcrumb" aria-label="breadcrumb">
            <Link href="/">Home</Link>
            <span>-</span>
            <span>About Us</span>
          </nav>
        </div>
      </section>

      {/* 2. Task 1: About Top Content Section */}
      <section className="about-content-sec">
        <div className="container">
          <div className="about-top">
            <p>
              <strong>Lorem Ipsum</strong> is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown
              <br className="about-break" />
              printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially
              <br className="about-break" />
              unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus
              <br className="about-break" />
              PageMaker including versions of Lorem Ipsum.
            </p>
            <p>
              <strong>Lorem Ipsum</strong> is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown
              <br className="about-break" />
              printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially
              <br className="about-break" />
              unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus
              <br className="about-break" />
              PageMaker including versions of Lorem Ipsum.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Why Choose CSD Car Purchase in India */}
      <WhyChooseSection />
    </div>
  );
}
