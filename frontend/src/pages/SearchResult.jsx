import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export default function SearchResult() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const location = useLocation();

  const getNumericPrice = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/,/g, '').replace(/[^0-9.]/g, '').replace(/\.$/, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatPrice = (val) => {
    const num = getNumericPrice(val);
    if (!num) return "0";
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

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
    const price = getNumericPrice(product?.current_price);
    if (price > 0) {
      if (percent === 0.01) {
        setTargetPrice(Math.max(1, price - 1).toFixed(2));
      } else {
        const discounted = price - (price * percent) / 100;
        setTargetPrice(discounted.toFixed(2));
      }
    }
  };

  const handleTrack = async () => {
    const cleanTarget = getNumericPrice(targetPrice);
    if (cleanTarget <= 0) {
      alert("Please enter a valid desired price");
      return;
    }
    const cleanCurrent = getNumericPrice(product.current_price);

    try {
      const payload = {
        asin: product.asin,
        title: product.title,
        image_url: product.image_url,
        amazon_url: product.amazon_url || product.url,
        rating: product.rating,
        stock_status: product.stock_status,
        desired_price: cleanTarget,
        current_price: cleanCurrent
      };
      await api.post('/products/track', payload);
      alert('Product successfully added to your watchlist.');
    } catch (err) {
      alert('Failed to add price watch. Please make sure you are logged in.');
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
        <p className="text-muted small mt-2">Loading product details and price trends...</p>
      </div>
    );
  }

  const analysis = product?.price_analysis || {};

  return (
    <div className="container py-4" style={{ maxWidth: '1100px' }}>
      {error ? (
        <div className="alert alert-danger text-center rounded-3 p-4 my-4 border-0">
          <h6 className="fw-semibold">Unable to Load Product</h6>
          <p className="small mb-0 text-muted">{error}</p>
        </div>
      ) : product ? (
        <>
          {/* Header */}
          <div className="mb-4 pb-3 border-bottom">
            <h4 className="fw-semibold text-dark mb-2" style={{ lineHeight: '1.4' }}>
              {product.title}
            </h4>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="badge bg-light text-dark border rounded-1 px-2 py-1 small">
                {product.rating || "Rating unavailable"}
              </span>
              <span className={`badge ${product.stock_status === 'In Stock' ? 'bg-success text-white' : 'bg-secondary text-white'} rounded-1 px-2 py-1 small`}>
                {product.stock_status || "Availability unknown"}
              </span>
              {product.asin && (
                <span className="badge bg-light text-muted border rounded-1 px-2 py-1 small">
                  ASIN: {product.asin}
                </span>
              )}
            </div>
          </div>

          <div className="row g-4">
            {/* Left Column: Image & Analysis */}
            <div className="col-lg-7">
              {/* Product Image */}
              <div className="card border rounded-3 p-4 text-center bg-white mb-4" style={{ borderColor: '#e5e7eb' }}>
                <img 
                  src={product.image_url} 
                  alt={product.title} 
                  className="img-fluid mx-auto"
                  style={{ maxHeight: '280px', objectFit: 'contain' }} 
                />
              </div>

              {/* Price Insights */}
              {analysis && (analysis.min_price || analysis.avg_price) && (
                <div className="card border rounded-3 p-4 bg-white mb-4" style={{ borderColor: '#e5e7eb' }}>
                  <h6 className="fw-semibold mb-3 text-dark">Price Summary</h6>

                  {/* Recommendation Message */}
                  {analysis.deal_advice === 'BEST_PRICE' && (
                    <div className="alert alert-success border-0 rounded-2 p-3 mb-3 small">
                      <strong>Lowest recorded price:</strong> This product is currently at or near its lowest recorded price.
                    </div>
                  )}

                  {analysis.deal_advice === 'BELOW_AVERAGE' && (
                    <div className="alert alert-info border-0 rounded-2 p-3 mb-3 small">
                      <strong>Below average price:</strong> Current price (₹{formatPrice(product.current_price)}) is below the historical average of ₹{formatPrice(analysis.avg_price)}.
                    </div>
                  )}

                  {analysis.deal_advice === 'ABOVE_AVERAGE' && (
                    <div className="alert alert-warning border-0 rounded-2 p-3 mb-3 small">
                      <strong>Above average price:</strong> Current price is higher than the historical average (₹{formatPrice(analysis.avg_price)}). Set a target price alert below.
                    </div>
                  )}

                  {/* 3 Metric Cards */}
                  <div className="row text-center g-2 mt-1">
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-2">
                        <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Lowest</small>
                        <span className="fs-6 fw-bold text-success">₹{formatPrice(analysis.min_price)}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-2">
                        <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Average</small>
                        <span className="fs-6 fw-bold text-secondary">₹{formatPrice(analysis.avg_price)}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-2">
                        <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Highest</small>
                        <span className="fs-6 fw-bold text-danger">₹{formatPrice(analysis.max_price)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price History Table */}
              {product.price_history && product.price_history.length > 0 && (
                <div className="card border rounded-3 p-4 bg-white" style={{ borderColor: '#e5e7eb' }}>
                  <h6 className="fw-semibold mb-3 text-dark">Price History</h6>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle text-center mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th className="py-2 fw-medium text-muted">Date</th>
                          <th className="py-2 fw-medium text-muted">Price</th>
                          <th className="py-2 fw-medium text-muted">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.price_history.map((entry, index) => {
                          const entryPrice = getNumericPrice(entry.price);
                          const currentPrice = getNumericPrice(product.current_price);
                          const diff = currentPrice - entryPrice;

                          return (
                            <tr key={entry.id || index}>
                              <td className="text-muted">{new Date(entry.timestamp).toLocaleDateString()}</td>
                              <td className="fw-semibold text-dark">₹{formatPrice(entryPrice)}</td>
                              <td>
                                {diff < -0.01 ? (
                                  <span className="badge bg-success bg-opacity-10 text-success rounded-1 px-2 py-1">
                                    -₹{formatPrice(Math.abs(diff))}
                                  </span>
                                ) : diff > 0.01 ? (
                                  <span className="badge bg-danger bg-opacity-10 text-danger rounded-1 px-2 py-1">
                                    +₹{formatPrice(diff)}
                                  </span>
                                ) : (
                                  <span className="badge bg-light text-muted border rounded-1 px-2 py-1">
                                    Current
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Track & Amazon Link */}
            <div className="col-lg-5">
              <div className="card border rounded-3 p-4 bg-white sticky-top" style={{ top: '2rem', borderColor: '#e5e7eb' }}>
                <div className="text-center pb-3 border-bottom">
                  <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem' }}>Amazon Price</small>
                  <h3 className="fw-bold text-dark mt-1 mb-0">₹{formatPrice(product.current_price)}</h3>
                </div>

                <div className="py-3">
                  <a 
                    href={product.amazon_url || product.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-warning w-100 rounded-2 py-2 fw-medium mb-3"
                  >
                    View on Amazon
                  </a>
                </div>

                {/* Price Alert Form */}
                <div className="p-3 bg-light rounded-3 border" style={{ borderColor: '#f0f0f0' }}>
                  <h6 className="fw-semibold mb-1 text-dark">Set Price Alert</h6>
                  <p className="text-muted small mb-3">
                    Receive an email notification when the price drops to or below your target.
                  </p>

                  <label className="form-label small fw-medium text-muted">Desired Price (₹)</label>
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-white border-end-0 rounded-start-2 text-muted">₹</span>
                    <input 
                      type="number" 
                      className="form-control border-start-0 rounded-end-2 bg-white" 
                      placeholder="e.g. 75000" 
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div className="d-flex gap-1 flex-wrap justify-content-center mb-3">
                    <button type="button" onClick={() => applyDiscount(3)} className="btn btn-outline-secondary btn-sm rounded-2 px-2 py-1 small">-3%</button>
                    <button type="button" onClick={() => applyDiscount(5)} className="btn btn-outline-secondary btn-sm rounded-2 px-2 py-1 small">-5%</button>
                    <button type="button" onClick={() => applyDiscount(10)} className="btn btn-outline-secondary btn-sm rounded-2 px-2 py-1 small">-10%</button>
                    <button type="button" onClick={() => applyDiscount(15)} className="btn btn-outline-secondary btn-sm rounded-2 px-2 py-1 small">-15%</button>
                    <button type="button" onClick={() => applyDiscount(0.01)} className="btn btn-outline-secondary btn-sm rounded-2 px-2 py-1 small">Any Drop</button>
                  </div>

                  <button 
                    onClick={handleTrack} 
                    className="btn btn-dark w-100 rounded-2 py-2 fw-medium"
                  >
                    Add to Watchlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-5 border rounded-3 bg-light bg-opacity-25 my-4">
          <p className="text-muted small mb-0">Paste an Amazon URL or ASIN in the search bar above.</p>
        </div>
      )}
    </div>
  );
}
