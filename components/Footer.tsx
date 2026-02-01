
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-12 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">MOLT RUNNER</span>
            </div>
            <p className="text-white text-sm max-w-sm leading-relaxed">
              Democratizing mining power through the browser. Securely mine Monero and receive automatic Solana payouts directly to your wallet. High transparency, low fees.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Technology</h4>
            <ul className="space-y-2 text-white text-xs">
              <li><a href="#" className="hover:text-purple-400 transition-colors">WASM Engine</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Solana Bridge</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Security Protocol</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Anti-Blocker</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-white text-xs">
              <li><a href="#" className="hover:text-purple-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Responsible Mining</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-900 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white text-[10px]">
            &copy; 2024 MOLT RUNNER. Built for the Decentralized Web.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-white text-[10px]">Network Status: <span className="text-green-500 font-bold">OPTIMAL</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
