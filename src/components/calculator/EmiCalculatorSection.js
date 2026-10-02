"use client";

import React, { useState } from "react";

export default function EmiCalculatorSection() {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");

  // Bank list with official logos and interest rates
  const banks = [
    {
      id: "hdfc",
      name: "HDFC Bank",
      rate: 9.4,
      rateStr: "9.40%",
      logo: "/visitor/home/1774781903_hdfc.webp",
      isBestDeal: true,
    },
    {
      id: "sbi",
      name: "SBI Bank",
      rate: 9.1,
      rateStr: "9.10%",
      logo: "/visitor/home/1774781953_sbi.webp",
      isBestDeal: false,
    },
    {
      id: "axis",
      name: "Axis Bank",
      rate: 9.4,
      rateStr: "9.40%",
      logo: "/visitor/home/1774782002_axis.webp",
      isBestDeal: false,
    },
    {
      id: "icici",
      name: "ICICI Bank",
      rate: 9.1,
      rateStr: "9.10%",
      logo: "/visitor/home/1774782028_icici.webp",
      isBestDeal: false,
    },
    {
      id: "boi",
      name: "Bank of India",
      rate: 9.4,
      rateStr: "9.40%",
      logo: "/visitor/home/1774782053_boi.webp",
      isBestDeal: false,
    },
  ];

  const handleSearch = () => {
    // Search action
  };

  // Car Brands list
  const brands = [
    "Maruti Suzuki",
    "Hyundai",
    "Tata Motors",
    "Mahindra",
    "Toyota",
    "Kia",
    "Honda",
    "Volkswagen",
    "Skoda",
    "MG",
    "Nissan",
    "Jeep",
  ];

  const states = [
    "Delhi",
    "Haryana",
    "Punjab",
    "Uttar Pradesh",
    "Rajasthan",
    "Maharashtra",
    "Karnataka",
    "Gujarat",
    "Tamil Nadu",
    "Madhya Pradesh",
    "Chandigarh",
    "Uttarakhand",
    "West Bengal",
    "Kerala",
    "Bihar",
  ];

  const modelsByBrand = {
    "Maruti Suzuki": ["Brezza", "Swift", "Baleno", "Grand Vitara", "Dzire", "Ertiga", "Fronx", "Jimny"],
    "Hyundai": ["Creta", "Venue", "i20", "Verna", "Exter", "Alcazar"],
    "Tata Motors": ["Nexon", "Punch", "Harrier", "Safari", "Tiago", "Altroz"],
    "Mahindra": ["Thar", "Scorpio-N", "XUV700", "Bolero", "XUV 3XO"],
    "Toyota": ["Innova Hycross", "Urban Cruiser Hyryder", "Fortuner", "Glanza"],
    "Kia": ["Seltos", "Sonet", "Carens", "EV6"],
  };

  const currentModels = modelsByBrand[selectedBrand] || [
    "Select Model",
    "Base Model",
    "Top Model",
  ];

  return (
    <div className="emi-calculator-wrapper">
      {/* 1. Hero Banner with car key image */}
      <section className="emi-banner">
        <div className="container">
          <h1 className="emi-banner-title">Find Your Car & Calculate EMI</h1>
        </div>
      </section>

      {/* 2. Main Section: Filter box + Bank cards combined in one component */}
      <section className="emi-sec">
        <div className="container">
          {/* SS 1: Filter Card with Selects & Search */}
          <div className="emi-filter-outer">
            <div className="emi-filters-row">
              <select
                className="emi-select"
                id="brand"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedModel("");
                }}
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                className="emi-select"
                id="state"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">Select State</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                className="emi-select"
                id="model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="">Select Model</option>
                {currentModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                className="emi-select"
                id="variant"
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value)}
              >
                <option value="">Select Varient</option>
                <option value="Base Variant">Base Variant</option>
                <option value="Mid Variant">Mid Variant</option>
                <option value="Top Variant">Top Variant</option>
                <option value="Automatic">Automatic (AT)</option>
              </select>
            </div>

            <div className="emi-search-wrap">
              <button
                type="button"
                className="emi-search-btn"
                onClick={handleSearch}
              >
                Search
              </button>
            </div>
          </div>

          {/* SS 2: Bank Interest Cards Row (Static) */}
          <div className="bank-container">
            <div className="intrezt-box-outer">
              {banks.map((b) => (
                <div key={b.id} className="bank-card">
                  {b.isBestDeal && (
                    <span className="badge-best">Best Deal</span>
                  )}
                  <img
                    src={b.logo}
                    alt={b.name}
                    className="bank-logo"
                  />
                  <h3>{b.name}</h3>
                  <p>Interest starts from</p>
                  <div className="rate">{b.rateStr}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
