"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button'; // Adjust path if your ui components are elsewhere
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Import DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Exchange, WatchlistItem } from '@/lib/types';
import { toast } from "sonner"


interface AddToWatchlistDialogProps {
  onAddToken: (item: WatchlistItem) => boolean; // Returns true if added, false if exists
}

export function AddToWatchlistDialog({ onAddToken }: AddToWatchlistDialogProps) {
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [token, setToken] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    if (!token.trim() || !/^\d+$/.test(token.trim())) {
      // alert('Please enter a valid numeric token.');
       toast.error("Invalid Token");
      return;
    }
    const success = onAddToken({ exchange, token: token.trim() });
    if (success) {
      toast.success("Token Added");
      setToken(''); // Clear input
      setIsOpen(false); // Close dialog
    } else {
      toast.warning("Token Exists");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className='text-primary'>Add Symbol</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>
            Enter the exchange and token number to add to your watchlist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exchange" className="text-right">
              Exchange
            </Label>
            <Select
              value={exchange}
              onValueChange={(value) => setExchange(value as Exchange)}
            >
              <SelectTrigger className="col-span-3 bg-slate-700 border-slate-600 focus:ring-sky-500">
                <SelectValue placeholder="Select an exchange" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="NSE">NSE</SelectItem>
                <SelectItem value="BSE">BSE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="token" className="text-right">
              Token No.
            </Label>
            <Input
              id="token"
              type="text" // Use text to allow leading zeros, validation handles numeric
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="col-span-3 bg-slate-700 border-slate-600 focus:ring-sky-500"
              placeholder="e.g., 3045"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="ghost" className="hover:bg-slate-700">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleAdd} className="bg-sky-600 hover:bg-sky-700">
            Add Token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}