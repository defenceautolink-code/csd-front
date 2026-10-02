"use client";

import React, { useState } from "react";

export default function HeroSection({ onOpenModal }) {
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState("");
  const [state, setState] = useState("");
  const [rank, setRank] = useState("");

  const brands = [
    { value: "maruti-suzuki", label: "Maruti Suzuki" },
    { value: "ford", label: "Ford" },
    { value: "honda", label: "Honda" },
    { value: "hyundai", label: "Hyundai" },
    { value: "jeep", label: "Jeep" },
    { value: "kia", label: "Kia" },
    { value: "nissan", label: "Nissan" },
    { value: "skoda", label: "Skoda" },
    { value: "suzuki", label: "Suzuki" },
    { value: "toyota", label: "Toyota" },
    { value: "volkswagen", label: "Volkswagen" },
    { value: "mahindra", label: "Mahindra" },
    { value: "tata-motors", label: "Tata Motors" },
    { value: "mg", label: "MG" },
  ];

  const budgets = [
    { value: "under-5-lakh", label: "Under ₹5 Lakh" },
    { value: "5-10-lakh", label: "₹5 Lakh - ₹10 Lakh" },
    { value: "10-15-lakh", label: "₹10 Lakh - ₹15 Lakh" },
    { value: "15-20-lakh", label: "₹15 Lakh - ₹20 Lakh" },
    { value: "above-20-lakh", label: "Above ₹20 Lakh" },
  ];

  const states = [
    { value: "delhi", label: "Delhi" },
    { value: "haryana", label: "Haryana" },
    { value: "punjab", label: "Punjab" },
    { value: "rajasthan", label: "Rajasthan" },
    { value: "uttar-pradesh", label: "Uttar Pradesh" },
    { value: "maharashtra", label: "Maharashtra" },
    { value: "gujarat", label: "Gujarat" },
    { value: "madhya-pradesh", label: "Madhya Pradesh" },
    { value: "uttarakhand", label: "Uttarakhand" },
    { value: "karnataka", label: "Karnataka" },
  ];

  const ranks = [
    { value: "officers", label: "Officers" },
    { value: "jcos", label: "JCOs" },
    { value: "ors", label: "ORs" },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (onOpenModal) {
      onOpenModal({ rank, brand });
    }
  };

  return (
    <div className="block block-slideshow banner-area">
      <div className="container">
        {/* Hero Heading */}
        <div className="hero-heading">
          <h1>
            GET THE BEST DEAL IN CSD CAR AND GET
            <br className="d-none d-md-inline" />{" "}
            EXTRA DISCOUNT AFTER CSD PRICE
          </h1>
          <p>
            Explore CSD prices for top Indian car brands like Maruti Suzuki, Hyundai, Tata and Mahindra across cities in India.
          </p>
        </div>

        {/* Banner Form Filter Bar */}
        <div className="block-finder__body banner-form-overlay banner-form">
          <form className="block-finder__form" onSubmit={handleSearch}>
            <div className="block-finder__form-control block-finder__form-control--select">
              <select
                name="brand"
                id="banner_brand"
                className="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                aria-label="Vehicle Brand"
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <i className="bi bi-chevron-down select-chevron"></i>
            </div>

            <div className="block-finder__form-control block-finder__form-control--select">
              <select
                name="budget"
                id="banner_budget"
                className="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                aria-label="Budget"
              >
                <option value="">Select Budget</option>
                {budgets.map((bg) => (
                  <option key={bg.value} value={bg.value}>
                    {bg.label}
                  </option>
                ))}
              </select>
              <i className="bi bi-chevron-down select-chevron"></i>
            </div>

            <div className="block-finder__form-control block-finder__form-control--select">
              <select
                name="state"
                id="banner_state"
                className="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                aria-label="Vehicle State"
              >
                <option value="">Select State</option>
                {states.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <i className="bi bi-chevron-down select-chevron"></i>
            </div>

            <div className="block-finder__form-control block-finder__form-control--select">
              <select
                name="rank"
                id="banner_rank"
                className="rank"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                aria-label="Rank"
              >
                <option value="">Select Your Rank</option>
                {ranks.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <i className="bi bi-chevron-down select-chevron"></i>
            </div>

            <button
              type="submit"
              className="block-finder__form-control block-finder__form-control--button"
            >
              Search
            </button>
          </form>
        </div>

        {/* Hero Image Card */}
        <div
          className="hero-img"
          onClick={() => onOpenModal && onOpenModal({ brand: "maruti-suzuki" })}
        >
          <img
            src="/visitor/home/260919110446_CSD-Maruti-Brezza-Price.webp"
            alt="CSD Maruti Brezza Price"
          />
        </div>
      </div>
    </div>
  );
}
