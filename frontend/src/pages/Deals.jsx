import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Deals() {
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await api.get('/products/deals');
        setDeals(res.data);
      } catch (err) {
        console.error("Failed to fetch deals", err);
      }
    };
    fetchDeals();
  }, []);

  return (
    <div className="container py-3 mt-4">
      <h4 className="text-start fw-bold mb-3 best-text">Amazon Today's Deals</h4>
      <p className="mb-4">
          Discover Amazon's latest limited-time offers! Stay updated with new deals as they appear.
      </p>

      <div className="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4" id="product_deals-container">
        {deals.map((product) => (
          <div className="col" key={product.id || product.product_url}>
            <div className="card h-100 border border-secondary">
                <Link to={`/result?url=${encodeURIComponent(product.product_url)}`}>
                    <img src={product.image_url} className="card-img-top p-2 mt-3" alt={product.title}
                        style={{ height: 'auto', maxHeight: '10rem', objectFit: 'contain', width: '100%' }} />
                </Link>
                <div className="card-body d-flex flex-column">
                    <Link to={`/result?url=${encodeURIComponent(product.product_url)}`} className="text-dark text-decoration-none">
                        <p className="card-title title-clamp px-2">{product.title}</p>
                    </Link>
                    <p className="fw-bold text-center my-2 mt-auto">₹{product.current_price}</p>
                    <a href={product.product_url} target="_blank" rel="noreferrer" className="btn btn-warning mt-auto">View at Amazon</a>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
