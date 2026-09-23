import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Wishlists = () => {
  const { user } = useAuth();
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Fetch wishlists
      axios.get(`${import.meta.env.VITE_API_URL}/wishlists`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      .then(res => {
        setWishlists(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user]);

  if (!user) return <div className="p-8">Please log in to view your wishlists.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Your Wishlists</h1>
      {loading ? (
        <p>Loading wishlists...</p>
      ) : wishlists.length === 0 ? (
        <p>You haven't created any wishlists yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlists.map(w => (
            <div key={w.id} className="border rounded-lg p-6 shadow-sm hover:shadow-md transition">
              <h2 className="text-xl font-semibold">{w.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{w.is_public ? 'Public' : 'Private'}</p>
              {w.is_public && (
                <div className="text-sm bg-gray-100 p-2 rounded mb-4 break-all">
                  Share link: {window.location.origin}/wishlist/shared/{w.share_token}
                </div>
              )}
              <Link to={`/wishlist/${w.id}`} className="text-blue-600 hover:underline">
                View Items &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlists;
