"use client";

import React, { useState } from "react";

export default function FaqSection({ hideTitle = false, initialOpen = 0 }) {
  const [openIndex, setOpenIndex] = useState(initialOpen);

  const faqs = [
    {
      question: "What documents are required to buy a new car?",
      answer:
        "- You need a valid government-issued ID, proof of address, and PAN card for registration and financing (if applicable).",
    },
    {
      question: "Can I book a car online?",
      answer:
        "- Yes, you can browse models, compare features, and book your new car directly from our website.",
    },
    {
      question: "Do you offer financing or EMI options?",
      answer:
        "- Yes, we work with trusted banks and NBFCs to provide easy EMI and loan options tailored to your budget.",
    },
    {
      question: "What is the delivery timeline after booking?",
      answer:
        "- Delivery time varies based on model availability. In-stock vehicles are usually delivered within 7 days.",
    },
    {
      question: "Do you offer car insurance and registration support?",
      answer:
        "- Yes, we provide end-to-end assistance for insurance, registration, and RTO documentation at the time of purchase.",
    },
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="custom-faq">
      <div className="container">
        {!hideTitle && (
          <h2 className="faq-title">Frequently Asked Questions</h2>
        )}

        <div className="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`faq-item ${isOpen ? "faq-item--open" : ""}`}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-question-text">{faq.question}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {isOpen ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
