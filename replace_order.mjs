import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /dueDate: ''\n\s+}\);/,
  `dueDate: '',\n    receiptNumber: ''\n  });`
);

content = content.replace(
  /if \(customer\.paymentMethod === 'Cheque'\) \{/,
  `if (['Telebirr', 'M-Pesa'].includes(customer.paymentMethod)) {\n      if (!customer.receiptNumber) newErrors.receiptNumber = 'Receipt number is required';\n    }\n    if (customer.paymentMethod === 'Cheque') {`
);

content = content.replace(
  /<motion\.div initial=\{\{ opacity: 0, height: 0 \}\} animate=\{\{ opacity: 1, height: 'auto' \}\} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-\[#00E5FF\]\/5">/,
  `{['Telebirr', 'M-Pesa'].includes(customer.paymentMethod) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-[#00E5FF]/5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Receipt / Transaction Number *</label>
                  <input 
                    type="text" 
                    value={customer.receiptNumber}
                    onChange={e => setCustomer({...customer, receiptNumber: e.target.value})}
                    className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm text-[#E0E7FF]", errors.receiptNumber ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
                  />
                </div>
              </motion.div>
            )}
            
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#00E5FF]/5">`
);

fs.writeFileSync('src/App.tsx', content);
