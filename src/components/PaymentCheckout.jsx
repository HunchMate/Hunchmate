import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

export default function PaymentCheckout({ amount = 0, onSuccess, onCancel }) {
  const [status, setStatus] = useState('idle'); // idle, processing, success
  const [method, setMethod] = useState('card');

  const handlePay = () => {
    setStatus('processing');
    // Simulate payment network request
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500); // Wait a bit to show success animation
    }, 2500);
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-500 font-medium max-w-xs mx-auto">
          Your registration is confirmed. Generating your ticket and QR code...
        </p>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-6" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h3>
        <p className="text-gray-500 font-medium">Please do not close this window...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total to pay</p>
          <h2 className="text-3xl font-black text-gray-900">₹{amount.toLocaleString('en-IN')}</h2>
        </div>
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <CreditCard className="w-6 h-6" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-900">Select Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                method === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Credit/Debit Card
            </button>
            <button
              type="button"
              onClick={() => setMethod('upi')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                method === 'upi' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              UPI / QR
            </button>
          </div>
        </div>

        {method === 'card' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Card Number</label>
              <input
                type="text"
                placeholder="4111 1111 1111 1111"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">CVV</label>
                <input
                  type="password"
                  placeholder="***"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Name on Card</label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {method === 'upi' && (
          <div className="space-y-4 text-center py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-40 h-40 mx-auto bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
              <span className="text-gray-400 font-bold text-sm">Scan QR Code</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 text-left block">Or enter UPI ID</label>
              <input
                type="text"
                placeholder="username@upi"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={handlePay}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Pay ₹{amount.toLocaleString('en-IN')}
          </button>
          
          <button
            onClick={onCancel}
            className="w-full py-3 text-gray-500 font-bold hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Payments are secured and encrypted (Mock)</span>
        </div>
      </div>
    </div>
  );
}
