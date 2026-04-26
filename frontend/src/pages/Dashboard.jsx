import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

import { io } from 'socket.io-client';

export default function Dashboard() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const { user } = useAuth();

  const fetchTracked = async () => {
    try {
      const res = await api.get('/products/tracked');
      setTrackedProducts(res.data);
    } catch (err) {
      console.error("Failed to fetch tracked products", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTracked();

      // Connect to socket for real-time updates
      const socket = io('http://localhost:5000');
      socket.on('dataUpdated', (data) => {
        if (data.type === 'prices') {
          console.log("Real-time update received: prices");
          fetchTracked();
        }
      });

      return () => socket.disconnect();
    }
  }, [user]);

  const untrack = async (asin) => {
    try {
      await api.delete(`/products/tracked/${asin}`);
      setTrackedProducts(trackedProducts.filter(p => p.product.asin !== asin));
    } catch (err) {
      alert("Failed to remove price watch");
    }
  };

  return (
    <div className="container mt-5">
      <h3 className="fw-bold best-text text-start mb-3">Your Recent Alerts</h3>
      
      {trackedProducts.length > 0 ? (
        <>
          <p className="mb-4">You have {trackedProducts.length} price drop alert{trackedProducts.length > 1 ? 's' : ''}!</p>
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {trackedProducts.map(({ product, target_price }) => (
              <div className="col" key={product.asin}>
                <div className="card border border-secondary h-100">
                  <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`}>
                    <img 
                      src={product.image_url} 
                      alt={product.title} 
                      className="card-img-top" 
                      style={{ height: '200px', objectFit: 'contain' }} 
                    />
                  </Link>

                  <div className="card-body d-flex flex-column justify-content-between">
                    <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`} style={{ textDecoration: 'none', color: 'black' }}>
                      <h5 className="card-title title-clamp px-2">
                          {product.title}
                      </h5>
                    </Link>
                    
                    <div className="text-center mt-1">
                      <p className="text-primary font-weight-bold" style={{ fontSize: '1.2rem', fontWeight: 'bolder' }}>
                        Current Price: ₹{product.current_price}
                      </p>
                      <p className="text-success font-weight-bold" style={{ fontSize: '1rem', fontWeight: 'bolder' }}>
                        Target Price: ₹{target_price}
                      </p>
                    </div>

                    <a href={product.amazon_url} target="_blank" rel="noreferrer" className="btn btn-warning mt-auto w-100 mb-3">
                      View on Amazon
                    </a>

                    <button 
                      onClick={() => untrack(product.asin)}
                      className="btn btn-danger"
                    >
                      Remove from Price Watch
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="alert alert-info text-center">
            You haven't added any products to your watchlist yet.
        </div>
      )}
    </div>
  );
}
