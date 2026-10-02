"use client";

import React, { useState, useEffect } from "react";

export default function FindCarModal({
  isOpen,
  onClose,
  initialRank = "",
  initialBrand = "",
}) {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedRank, setSelectedRank] = useState("");

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

  useEffect(() => {
    if (initialRank) {
      setSelectedRank(initialRank);
    }
  }, [initialRank]);

  useEffect(() => {
    if (initialBrand) {
      setSelectedBrand(initialBrand);
    }
  }, [initialBrand]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Search filters:", {
      brand: selectedBrand,
      budget: selectedBudget,
      state: selectedState,
      rank: selectedRank,
    });
    onClose();
  };

  return (
    <div
      className="modal fade show modal-zoom searchModal d-block custom-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          {/* Close Button */}
          <button
            type="button"
            className="close position-absolute"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>

          <div className="modal-body">
            <div className="search-modal-form">
              <h2>Find Your Perfect Car</h2>
              <p>Filter by city, brand & budget to find the best match</p>

              <form className="block-finder__form" onSubmit={handleSearch}>
                <div className="block-finder__form-control block-finder__form-control--select">
                  <select
                    name="brand"
                    aria-label="Vehicle Brand"
                    className="brand"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
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
                    className="budget"
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value)}
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
                    aria-label="Vehicle State"
                    className="state"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
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
                    aria-label="Rank"
                    className="rank"
                    value={selectedRank}
                    onChange={(e) => setSelectedRank(e.target.value)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
