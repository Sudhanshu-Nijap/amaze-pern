import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../services/api';

export default function GlobalSearchResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const query = params.get('q');

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const res = await api.get(`/products/search-db?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error("Failed to fetch search results", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query]);

  return (
    <div className="container py-3 mt-4">
      <h4 className="text-start fw-bold mb-3 best-text">Search Results for "{query}"</h4>
      
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status"></div>
          <p className="text-muted mt-2">Searching database...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4" id="product-container">
          {results.map((product) => (
            <div className="col" key={product.id || product.amazon_url}>
              <div className="card h-100 border border-secondary">
                  <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`}>
                      <img src={product.image_url} className="card-img-top p-2 mt-3" alt={product.title}
                          style={{ height: 'auto', maxHeight: '10rem', objectFit: 'contain', width: '100%' }} />
                  </Link>
                  <div className="card-body d-flex flex-column">
                      <Link to={`/result?url=${encodeURIComponent(product.amazon_url)}`} className="text-dark text-decoration-none">
                          <p className="card-title title-clamp px-2">{product.title}</p>
                      </Link>
                      <p className="fw-bold text-center my-2 mt-auto">₹{product.current_price}</p>
                      <a href={product.amazon_url} target="_blank" rel="noreferrer" className="btn btn-warning mt-auto">View at Amazon</a>
                  </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-5 border rounded-3 bg-light">
          <p className="text-muted mb-0">No products found matching "{query}". Try a different search term or paste an Amazon URL to scrape a new product.</p>
        </div>
      )}
    </div>
  );
}
