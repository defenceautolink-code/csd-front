"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BLOGS_DATA } from "@/data/blogsData";

export default function BlogDetailSection({ slug }) {
  const currentSlug = slug || "best-blue-cars-in-india";
  const blog = BLOGS_DATA.find((b) => b.slug === currentSlug) || BLOGS_DATA[0];
  const otherPosts = BLOGS_DATA.filter((b) => b.slug !== blog.slug);

  const [likes, setLikes] = useState(blog.likes);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLike = () => {
    if (isLiked) {
      setLikes((prev) => prev - 1);
      setIsLiked(false);
    } else {
      setLikes((prev) => prev + 1);
      setIsLiked(true);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="blog-detail-wrapper">
      {/* Header with Tricolor Gradient & Title */}
      <section className="blog-detail-header">
        <div className="container">
          <h1 className="blog-detail-title">{blog.title}</h1>
        </div>
      </section>

      {/* 2. Image & Description */}
      <section className="blog-detail-content-sec">
        <div className="container">
          <div className="blog-detail-card">
            {/* Top Large Featured Image (1308.4 * 736.54) */}
            <div className="blog-detail-image-box">
              <img
                src={blog.image}
                alt={blog.title}
                className="blog-detail-main-img"
              />
            </div>

            {/* Stats under Image */}
            <div className="blog-detail-stats">
              <button
                type="button"
                className={`blog-stat-btn ${isLiked ? "blog-stat-btn--active" : ""}`}
                onClick={handleLike}
                aria-label="Like post"
              >
                <i className="bi bi-hand-thumbs-up"></i>
                <span>{likes}</span>
              </button>

              <div className="blog-stat-item">
                <i className="bi bi-eye"></i>
                <span>{blog.views}</span>
              </div>

              <button
                type="button"
                className="blog-stat-btn"
                onClick={handleShare}
                title={copied ? "Link copied!" : "Share post"}
                aria-label="Share post"
              >
                <i className={`bi ${copied ? "bi-check2" : "bi-share"}`}></i>
                <span>{blog.shares}</span>
              </button>
            </div>

            {/* Description Text */}
            <div className="blog-detail-body">
              <p className="blog-detail-desc">{blog.introText}</p>

              {/* Table */}
              {blog.carTable && blog.carTable.length > 0 && (
                <div className="blog-table-responsive">
                  <table className="blog-detail-table">
                    <thead>
                      <tr>
                        <th>Car Name</th>
                        <th>Colour</th>
                        <th>Price in Rupees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blog.carTable.map((row, idx) => (
                        <tr key={idx}>
                          <td><strong>{row.name}</strong></td>
                          <td>{row.color}</td>
                          <td>{row.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Conclusion Text */}
              <p className="blog-detail-desc blog-detail-desc--bottom">
                {blog.conclusionText}
              </p>
            </div>
          </div>

          {/* Divider */}
          <hr className="blog-detail-divider" />

          {/* 3. Latest Posts Section */}
          <div className="blog-detail-latest-sec">
            <h2 className="blog-latest-heading">Latest Posts</h2>

            <div className="blog-latest-grid">
              {otherPosts.map((post) => (
                <div key={post.id} className="blog-latest-card">
                  <div className="blog-latest-img-wrap">
                    <Link href={`/blogs/${post.slug}`}>
                      <img
                        src={post.image}
                        alt={post.title}
                        className="blog-latest-thumb"
                      />
                    </Link>
                  </div>

                  <div className="blog-latest-stats">
                    <span className="blog-stat-item">
                      <i className="bi bi-hand-thumbs-up"></i>
                      <span>{post.likes}</span>
                    </span>
                    <span className="blog-stat-item">
                      <i className="bi bi-eye"></i>
                      <span>{post.views}</span>
                    </span>
                    <span className="blog-stat-item">
                      <i className="bi bi-share"></i>
                      <span>{post.shares}</span>
                    </span>
                  </div>

                  <div className="blog-latest-body">
                    <h3 className="blog-latest-title">
                      <Link href={`/blogs/${post.slug}`}>{post.title}</Link>
                    </h3>

                    <p className="blog-latest-snippet">{post.snippet}</p>

                    <div className="blog-latest-action">
                      <Link
                        href={`/blogs/${post.slug}`}
                        className="blog-readmore-btn"
                      >
                        Read more
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
