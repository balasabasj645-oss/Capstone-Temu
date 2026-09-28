<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FaceBypassRequest extends Model
{
    use HasFactory;

    protected $primaryKey = 'bypass_id';

    protected $fillable = [
        'enforcer_id',
        'request_type',
        'reason',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'used_at',
        'expires_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'used_at'     => 'datetime',
        'expires_at'  => 'datetime',
    ];

    /* ---------------- Scopes ---------------- */

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * An approval is "usable" when it is approved, not yet consumed,
     * and hasn't expired.
     */
    public function scopeUsable($query)
    {
        return $query->where('status', 'approved')
            ->whereNull('used_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            });
    }

    /* ---------------- Relations ---------------- */

    public function enforcer()
    {
        return $this->belongsTo(User::class, 'enforcer_id', 'user_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'user_id');
    }
}