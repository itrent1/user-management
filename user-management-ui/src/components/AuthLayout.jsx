export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div 
      className="bg-light d-flex justify-content-center align-items-center"
      style={{
        position: "fixed",  
        top: 0,
        left: 0,
        width: "100vw",    
        height: "100vh",    
        zIndex: 1000,       
        overflowY: "auto"  
      }}
    >
      <div className="p-4" style={{ width: "100%", maxWidth: "600px" }}>
        
        <div className="card shadow-lg border-0 rounded-4">
          <div className="card-body p-5">
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-1">{title}</h2>
              {subtitle && <div className="text-muted small">{subtitle}</div>}
            </div>
            {children}
          </div>
        </div>

        <div className="text-center text-muted small mt-3">
          © User Management {new Date().getFullYear()}
        </div>
        
      </div>
    </div>
  );
}