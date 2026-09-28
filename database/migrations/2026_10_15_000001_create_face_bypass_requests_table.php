<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('face_bypass_requests', function (Blueprint $table) {
            $table->id('bypass_id');
            $table->foreignId('enforcer_id')
                ->constrained('users', 'user_id')
                ->onDelete('cascade');

            // Which flow is being requested (in|out) — informational only,
            // the approval grants a single bypass either way.
            $table->string('request_type', 8)->default('in');

            // Free-text reason the enforcer can supply (e.g. "camera broken").
            $table->string('reason', 500)->nullable();

            // pending | approved | rejected | used | expired
            $table->string('status', 20)->default('pending');

            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users', 'user_id')
                ->onDelete('set null');
            $table->datetime('reviewed_at')->nullable();
            $table->string('review_notes', 500)->nullable();

            // Set when the enforcer actually consumes the bypass.
            $table->datetime('used_at')->nullable();

            // Optional expiry — if approval should only be valid for N hours.
            // For a 1-shot bypass we don't set this; we rely on status='used'.
            $table->datetime('expires_at')->nullable();

            $table->timestamps();

            $table->index(['enforcer_id', 'status']);
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('face_bypass_requests');
    }
};