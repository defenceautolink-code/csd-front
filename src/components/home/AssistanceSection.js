"use client";

import React from "react";
import Link from "next/link";

export default function AssistanceSection() {
  return (
    <section className="csd-assistance-section">
      <div className="csd-assistance-banner">
        <div className="container">
          <div className="csd-assistance-content">
            {/* Left Content */}
            <div className="csd-assistance-left">
              <span className="csd-assistance-badge">CSD Car Assistance</span>
              <h2 className="csd-assistance-title">
                Confused About Buying a<br className="d-none d-sm-inline" /> Car Through CSD?
              </h2>
            </div>

            {/* Center Thinking Person Image */}
            <div className="csd-assistance-center">
              <img
                src="/visitor/home/260329121653_recommended-img.webp"
                alt="Confused About Buying a Car Through CSD?"
                className="csd-assistance-img"
              />
            </div>

            {/* Right Content */}
            <div className="csd-assistance-right">
              <p className="csd-assistance-desc">
                We help defence personnel and ex-servicemen purchase cars through the CSD canteen with complete guidance, best deals, and hassle-free documentation support.
              </p>
              <Link href="/contact" className="csd-assistance-btn">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
