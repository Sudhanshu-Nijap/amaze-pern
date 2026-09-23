import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const HotDeals = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/products/hot-deals`)
      .then(res => {
        setDeals(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">🔥 Hot Deals Feed</h1>
        <span className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded-full font-medium">Community Picks</span>
      </div>
      
      {loading ? (
        <p>Loading the hottest deals...</p>
      ) : deals.length === 0 ? (
        <p>No hot deals found at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {deals.map(deal => (
            <div key={deal.id} className="border rounded-xl p-4 shadow-sm hover:shadow-lg transition flex flex-col">
              <img src={deal.image_url} alt={deal.title} className="h-48 object-contain mb-4 mx-auto" />
              <h2 className="text-lg font-semibold line-clamp-2 mb-2" title={deal.title}>{deal.title}</h2>
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-green-600">₹{deal.current_price}</span>
                  <span className="text-sm line-through text-gray-500">₹{deal.max_historical_price}</span>
                </div>
                <div className="bg-red-500 text-white text-center text-sm font-bold py-1 rounded mb-4 shadow-sm">
                  {parseFloat(deal.drop_percentage).toFixed(0)}% Price Drop!
                </div>
                <Link to={`/result?url=${encodeURIComponent(deal.amazon_url)}`} className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                  View Deal
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotDeals;
