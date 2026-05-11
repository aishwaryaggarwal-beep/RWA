"use client";

import { useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";

export default function SellerPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    area: "",
    price: "",
    totalTokens: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://rwa-pied.vercel.app"}/land`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Land listed successfully 🚀");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthGuard>
    <div>
      <h1>List Your Land</h1>

      <input name="title" className="input" placeholder="Title" onChange={handleChange} />
      <input name="description" className="input" placeholder="Description" onChange={handleChange} />
      <input name="location" className="input" placeholder="Location" onChange={handleChange} />
      <input name="area" className="input" placeholder="Area (sq ft)" onChange={handleChange} />
      <input name="price" className="input" placeholder="Total Price" onChange={handleChange} />
      <input name="totalTokens" className="input" placeholder="Total Tokens" onChange={handleChange} />

      <button className="btn" onClick={handleSubmit}>
        Submit Land
      </button>
    </div>
    </AuthGuard>
  );
}