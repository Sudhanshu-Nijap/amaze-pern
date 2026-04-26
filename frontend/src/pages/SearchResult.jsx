import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export default function SearchResult() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const url = params.get('url');

    if (url) {
      if (location.pathname === '/search') {
        handleSearch(url);
      } else {
        handleResult(url);
      }
    }
  }, [location.pathname, location.search]);

  const handleSearch = async (url) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/products/search', { url });
      setProduct(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch product details.');
    } finally {
      setLoading(false);
    }
  };

  const handleResult = async (url) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/products/result?url=${encodeURIComponent(url)}`);
      setProduct(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch product details.');
    } finally {
      setLoading(false);
    }
  };

  const applyDiscount = (percent) => {
    if (product?.current_price) {
      const price = parseFloat(product.current_price);
      setTargetPrice((price - (price * percent) / 100).toFixed(2));
    }
  };

  const handleTrack = async () => {
    if (!targetPrice) {
      alert("Please set a desired price");
      return;
    }
    try {
      const payload = {
        asin: product.asin,
        title: product.title,
        image_url: product.image_url,
        amazon_url: product.amazon_url || product.url,
        rating: product.rating,
        stock_status: product.stock_status,
        desired_price: parseFloat(targetPrice),
        current_price: parseFloat(product.current_price)
      };
      await api.post('/products/track', payload);
      alert('✅ Product successfully added to your watchlist!');
    } catch (err) {
      alert('Failed to add price watch. Please make sure you are logged in.');
    }
  };

  if (loading) {
    return <div className="container mt-5 text-center"><h3>Loading...</h3></div>;
  }

  return (
    <div className="container mt-5">
      {error ? (
        <div className="alert alert-danger text-center">
            <strong>Error:</strong> {error}
        </div>
      ) : product ? (
        <>
          <h3 className="fw-bold text-center mb-4">{product.title}</h3>

          <div className="row d-flex align-items-start">
              
              <div className="col-md-6 text-center">
                  <img src={product.image_url} alt="Product Image" className="img-fluid rounded w-100"
                      style={{ maxHeight: '350px', objectFit: 'contain' }} />
                  
                  {product.price_history && product.price_history.length > 0 && (
                    <div className="row mt-5">
                        <div className="col-md-10 mx-auto">
                            <h4 className="fw-bold text-center mb-3">Amazon Price History</h4>
                            <div className="table-responsive">
                                <table className="table table-striped table-bordered text-center align-middle">
                                    <thead>
                                        <tr>
                                            <th className="py-2">Date</th>
                                            <th className="py-2">Price (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {product.price_history.map((entry, index) => (
                                          <tr key={entry.id} className={index === 0 ? "fw-bold text-primary" : ""}>
                                              <td>{new Date(entry.timestamp).toLocaleDateString()}</td>
                                              <td className="fw-semibold text-success">₹{entry.price}</td>
                                          </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                  )}
              </div>

              <div className="col-md-6 d-flex justify-content-center">
                  <div className="border rounded p-3 shadow-sm bg-light text-center" style={{ width: '90%', maxWidth: '350px' }}>
                      <h3 id="product-price" className="fw-bold text-success product-price">&#8377;{product.current_price}</h3>
                      <p className="text-muted">Amazon Price</p>

                      <p className="fw-semibold">⭐ {product.rating}</p>
                      
                      <p className={`fw-bold ${product.stock_status === 'In Stock' ? 'text-success' : 'text-danger'}`}>
                          {product.stock_status}
                      </p>

                      <a href={product.amazon_url} target="_blank" rel="noreferrer" className="btn btn-warning fw-bold w-100 rounded-pill">View at Amazon</a>

                      <div className="mt-4 p-3 border rounded bg-white">
                          <h6 className="fw-bold mb-2">Amazon Price Watch</h6>
                          <p className="text-muted">We'll notify you when the price drops.</p>

                          <label>Desired Price</label>
                          <input 
                            type="text" 
                            id="desired-price" 
                            className="form-control mb-2 mt-1 rounded-pill" 
                            placeholder="₹" 
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                          />
                          <div className="d-flex gap-2 flex-wrap justify-content-center">
                              <button onClick={() => applyDiscount(3)} className="btn btn-outline-secondary rounded-pill px-3">-3%</button>
                              <button onClick={() => applyDiscount(5)} className="btn btn-outline-secondary rounded-pill px-3">-5%</button>
                              <button onClick={() => applyDiscount(7)} className="btn btn-outline-secondary rounded-pill px-3">-7%</button>
                              <button onClick={() => applyDiscount(10)} className="btn btn-outline-secondary rounded-pill px-3">-10%</button>
                              <button onClick={() => applyDiscount(0.01)} className="btn btn-outline-secondary rounded-pill px-3">Any Price Drop!</button>
                          </div>

                          <button onClick={handleTrack} className="btn btn-primary mt-3">
                              +Add Price Watch
                          </button>
                      </div>

                  </div>
              </div>
          </div>
        </>
      ) : (
        <div className="text-center mt-5">Please search for a product.</div>
      )}
    </div>
  );
}
