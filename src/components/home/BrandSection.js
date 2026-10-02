"use client";

import React from "react";

export default function BrandSection({ onOpenModal }) {
  const brands = [
    { name: "Ford", slug: "ford", image: "/visitor/home/ford.webp" },
    { name: "Honda", slug: "honda", image: "/visitor/home/hond.webp" },
    { name: "Hyundai", slug: "hyundai", image: "/visitor/home/hyundai.webp" },
    { name: "Jeep", slug: "jeep", image: "/visitor/home/jeep.webp" },
    { name: "Kia", slug: "kia", image: "/visitor/home/ia.webp" },
    { name: "Nissan", slug: "nissan", image: "/visitor/home/nissan.webp" },
    { name: "Skoda", slug: "skoda", image: "/visitor/home/skoda.webp" },
    { name: "Suzuki", slug: "suzuki", image: "/visitor/home/suzuki.webp" },
    { name: "Toyota", slug: "toyota", image: "/visitor/home/toyota.webp" },
    { name: "Volkswagen", slug: "volkswagen", image: "/visitor/home/volswagen.webp" },
    { name: "Mahindra", slug: "mahindra", image: "/visitor/home/mahindra.avif" },
    { name: "Tata Motors", slug: "tata-motors", image: "/visitor/home/tata motors.webp" },
    { name: "MG", slug: "mg", image: "/visitor/home/MG.webp" },
    { name: "Maruti Suzuki", slug: "maruti-suzuki", image: "/visitor/home/maruti suzuki.webp" },
  ];

  const handleBrandClick = (e, slug) => {
    e.preventDefault();
    if (onOpenModal) {
      onOpenModal({ brand: slug });
    }
  };

  return (
    <div className="block block-categories car-logo-sec">
      <div className="container">
        <div className="block-categories__header">
          <div className="block-categories__title">
            Choose Your Car Brand for CSD Price
          </div>
        </div>
      </div>

      <div className="block-categories__body">
        <div className="container">
          <div className="block-brands__list2">
            {brands.map((brand) => (
              <div key={brand.slug} className="block-brands__item">
                <a
                  href={`#${brand.slug}`}
                  className="searchBrandModal block-brands__item-link"
                  onClick={(e) => handleBrandClick(e, brand.slug)}
                >
                  <img src={brand.image} alt={brand.name} />
                  <span className="block-brands__item-name">{brand.name}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
