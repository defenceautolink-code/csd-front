"use client";

import React from "react";

export default function EligibilitySection({ onOpenModal }) {
  const categories = [
    {
      id: "officers",
      title: "Officers",
      value: "officers",
      image: "/visitor/home/ifficers.webp",
      alt: "Officers",
    },
    {
      id: "jcos",
      title: "JCOs",
      value: "jcos",
      image: "/visitor/home/JCOs.webp",
      alt: "JCOs",
    },
    {
      id: "ors",
      title: "ORs",
      value: "ors",
      image: "/visitor/home/oRs.webp",
      alt: "ORs",
    },
  ];

  return (
    <section className="csd-eligibility">
      <div className="container">
        <div className="section-title text-center">
          <h2>CSD Car Eligibility</h2>
          <p>
            Check which cars you can buy through CSD canteen based on your category
          </p>
        </div>

        <div className="eligibility-box">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="eligibility-item"
              onClick={() => onOpenModal && onOpenModal({ rank: cat.value })}
            >
              <span className="check">
                <img src={cat.image} alt={cat.alt} />
              </span>
              <h4>{cat.title}</h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
