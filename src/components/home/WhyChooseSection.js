"use client";

import React from "react";

export default function WhyChooseSection() {
  const cards = [
    {
      id: "lower-prices",
      iconType: "text",
      iconText: "₹",
      title: "Lower CSD Prices",
      description:
        "Buy cars at significantly lower prices through CSD canteen compared to showroom rates. Save up to ₹3 Lakhs on top brands like Maruti, Hyundai, Tata and Mahindra.",
    },
    {
      id: "genuine-process",
      iconType: "shield",
      title: "100% Genuine Process",
      description:
        "CSD car purchase is a government-authorized process for defence personnel ensuring transparency, verified pricing and secure transactions.",
    },
    {
      id: "purchase-assistance",
      iconType: "handshake",
      title: "Complete Purchase Assistance",
      description:
        "Get complete expert support from car selection to documentation and delivery process. We assist defence personnel at every step of the CSD car purchase journey.",
    },
  ];

  const stats = [
    {
      id: "cars-listed",
      icon: "/visitor/home/1774724356_av-car.svg",
      number: "500+",
      label: "CSD Cars Listed",
    },
    {
      id: "happy-customers",
      icon: "/visitor/home/1774724512_happy-customar.svg",
      number: "10K+",
      label: "Happy Defence Customers",
    },
    {
      id: "car-sold",
      icon: "/visitor/home/1774724545_sold-car.svg",
      number: "100+",
      label: "Car Sold",
    },
    {
      id: "trusted-pricing",
      icon: "/visitor/home/1774724578_happy-customar.svg",
      number: "100%",
      label: "Trusted CSD Pricing",
    },
  ];

  return (
    <section className="why-choose-sec" >
      <div className="container">
        {/* Section Heading */}
        <div className="section-title text-center">
          <h2>Why Choose CSD Car Purchase in India</h2>
          <p>
            Check latest CSD car prices and explore benefits for defence personnel across India.
          </p>
        </div>

        {/* 3 Benefit Cards */}
        <div className="why-choose-cards">
          {cards.map((card) => (
            <div key={card.id} className="why-choose-card">
              <div className="why-choose-card-header">
                <div className="why-choose-card-icon">
                  {card.iconType === "text" && <span>{card.iconText}</span>}
                  {card.iconType === "shield" && (
                    <i className="bi bi-shield-check"></i>
                  )}
                  {card.iconType === "handshake" && (
                    <i className="bi bi-people-fill"></i>
                  )}
                </div>
                <h3>{card.title}</h3>
              </div>
              <p>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom Statistics Bar */}
        <div className="why-choose-stats">
          {stats.map((stat) => (
            <div key={stat.id} className="why-choose-stat-item">
              <img
                src={stat.icon}
                alt={stat.label}
                className="why-choose-stat-icon"
              />
              <div className="why-choose-stat-info">
                <span className="why-choose-stat-number">{stat.number}</span>
                <span className="why-choose-stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
