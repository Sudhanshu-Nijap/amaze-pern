import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { io } from 'socket.io-client';

export default function Home() {
  const [bestsellers, setBestsellers] = useState([]);
  const [deals, setDeals] = useState([]);

  const fetchHomeData = async () => {
    try {
      const bsRes = await api.get('/products/bestsellers');
      setBestsellers(bsRes.data.slice(0, 10));

      const dealRes = await api.get('/products/deals');
      setDeals(dealRes.data.slice(0, 10));
    } catch (err) {
      console.error("Failed to load products", err);
    }
  };

  useEffect(() => {
    fetchHomeData();

    // Connect to socket for real-time updates
    const socket = io('http://localhost:5000');
    socket.on('dataUpdated', (data) => {
      if (data.type === 'daily') {
        console.log("Real-time update received: daily");
        fetchHomeData();
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="container py-5 text-center text-md-start animate-fade-in">
          <div className="row align-items-center">
              <div className="col-12 col-md-5">
                  <h1 className="hero-text">
                      <span className="text-orange">Save money</span>
                      <span className="d-block">on your next Amazon purchase.</span>
                  </h1>
                  <p className="hero-subtext sub-text mt-3">
                      <span className="text-orange fw-bold title">amaze</span> is a free Amazon price tracker, alerting you to
                      good deals on products you love.
                  </p>
                  <Link to="/register" className="btn-orange text-decoration-none mt-4" style={{width: 'fit-content'}}>Sign up for free</Link>
              </div>
              <div className="col-12 col-md-7 text-md-end mt-4 mt-md-0">
                  <img src="/img/hero.jpg" alt="Hero Image" className="img-fluid hero-image rounded-4" />
              </div>
          </div>
      </section>

      {/* Features Section */}
      <div className="container-fluid px-5 mt-5">
          <h4 className="text-center fw-bold title best-text mb-4">Powerful Features</h4>
          <div className="row justify-content-center">
              <div className="col-12 col-md-5 p-3">
                  <img src="/img/feature1.png" alt="Feature 1" className="img-fluid rounded-3 shadow-sm" />
              </div>
              <div className="col-12 col-md-5 p-3">
                  <img src="/img/feature2.png" alt="Feature 2" className="img-fluid rounded-3 shadow-sm" />
              </div>
          </div>
      </div>

      <div className="container-fluid px-5 py-4">
          <div className="line"></div>
      </div>

      {/* Bestseller Section */}
      <div className="container py-5 mt-4">
          <h4 className="text-start fw-bold mb-3 best-text">Amazon Bestsellers</h4>
          <p className="mb-4">
              Explore the hottest products everyone is buying on Amazon! These top-rated picks are updated frequently.
          </p>
          <div id="product-container" className="d-flex overflow-auto pb-3 scrollbar-hidden">  
              {bestsellers.map(product => (
              <div key={product.id || product.product_url} className="card flex-shrink-0 border border-secondary mx-2 shadow-sm" style={{width: '18rem', height: '24.5rem'}}>
                  <Link to={`/result?url=${encodeURIComponent(product.product_url)}`}>
                      <img src={product.image_url} className="card-img-top p-2 mt-3" alt={product.title}
                          style={{height: 'auto', maxHeight: '10rem', objectFit: 'contain', width: '100%'}} />
                  </Link>
                  <div className="card-body d-flex flex-column">
                      <Link to={`/result?url=${encodeURIComponent(product.product_url)}`} className="text-dark text-decoration-none">
                          <p className="card-title title-clamp px-2 fw-semibold">{product.title}</p>
                      </Link>
                      <p className="fw-bold text-center my-2 mt-auto text-primary" style={{fontSize: '1.2rem'}}>₹{product.current_price}</p>
                      <a href={product.product_url} target="_blank" rel="noreferrer" className="btn btn-warning mt-auto fw-bold">View at Amazon</a>
                  </div>
              </div>
              ))}
          </div>
      </div>

      {/* Today's Deals Section */}
      <div className="container py-5 mb-5">
          <h4 className="text-start fw-bold mb-3 best-text">Amazon Today's Deals</h4>  
          <p className="mb-4">
              Discover Amazon's latest limited-time offers! Stay updated with new deals as they appear.
          </p>
          <div id="product_deals-container" className="d-flex overflow-auto pb-3 scrollbar-hidden"> 
              {deals.map(product => (
              <div key={product.id || product.product_url} className="card flex-shrink-0 border border-secondary mx-2 shadow-sm" style={{width: '18rem', height: '24.5rem'}}>
                  <Link to={`/result?url=${encodeURIComponent(product.product_url)}`}>
                      <img src={product.image_url} className="card-img-top p-2 mt-3" alt={product.title}
                          style={{height: 'auto', maxHeight: '10rem', objectFit: 'contain', width: '100%'}} />
                  </Link>
                  <div className="card-body d-flex flex-column">
                      <Link to={`/result?url=${encodeURIComponent(product.product_url)}`} className="text-dark text-decoration-none">
                          <p className="card-title title-clamp px-2 fw-semibold">{product.title}</p>
                      </Link>
                      <p className="fw-bold text-center my-2 mt-auto text-primary" style={{fontSize: '1.2rem'}}>₹{product.current_price}</p>
                      <a href={product.product_url} target="_blank" rel="noreferrer" className="btn btn-warning mt-auto fw-bold">View at Amazon</a>
                  </div>
              </div>
              ))}
          </div>
      </div>
    </>
  );
}
