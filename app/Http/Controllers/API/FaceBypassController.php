<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FaceBypassRequest;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class FaceBypassController extends Controller
{
    /* ================================================================
     | MOBILE — enforcer side
     ================================================================ */

    /**
     * POST /api/face-bypass/request
     * Body: { request_type?: "in"|"out", reason?: string }
     *
     * Creates a new pending request. If the enforcer already has a
     * pending request, returns that one instead of stacking duplicates.
     */
    public function request(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'request_type' => 'nullable|in:in,out',
            'reason'       => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $enforcerId = $request->user()->user_id;

        // Don't allow stacking — if there's already a pending or
        // unused approval, just return it.
        $existing = FaceBypassRequest::where('enforcer_id', $enforcerId)
            ->where(function ($q) {
                $q->where('status', 'pending')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'approved')
                         ->whereNull('used_at')
                         ->where(function ($q3) {
                             $q3->whereNull('expires_at')
                                ->orWhere('expires_at', '>', now());
                         });
                  });
            })
            ->orderByDesc('bypass_id')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have an active bypass request.',
                'request' => $existing,
                'already_exists' => true,
            ], 200);
        }

        $bypass = FaceBypassRequest::create([
            'enforcer_id'  => $enforcerId,
            'request_type' => $request->request_type ?? 'in',
            'reason'       => $request->reason,
            'status'       => 'pending',
        ]);

        // -------- Notifications --------
        try {
            $enforcer = $request->user();
            $name = trim("{$enforcer->firstname} {$enforcer->lastname}");
            $reasonSuffix = $request->reason ? " Reason: {$request->reason}" : '';

            NotificationService::notifyAdmins(
                'Face Bypass Requested',
                "{$name} requested a face-verification bypass for time-{$bypass->request_type}.{$reasonSuffix}",
                Notification::TYPE_FACE_BYPASS_REQUESTED,
                'user',
                $enforcerId
            );

            NotificationService::notifyUser(
                $enforcerId,
                'Bypass Request Submitted',
                'Your request is pending admin approval. You will be notified when it is reviewed.',
                Notification::TYPE_FACE_BYPASS_REQUESTED,
                'user',
                $enforcerId
            );
        } catch (\Throwable $ne) {
            Log::warning('Face bypass request notification failed: ' . $ne->getMessage());
        }

        return response()->json([
            'message' => 'Bypass request submitted. Please wait for admin approval.',
            'request' => $bypass,
        ], 201);
    }

    /**
     * GET /api/face-bypass/my-status
     *
     * Returns the enforcer's latest request and a computed
     * `has_active_bypass` flag the mobile app uses to switch flows.
     */
    public function myStatus(Request $request)
    {
        $enforcerId = $request->user()->user_id;

        $latest = FaceBypassRequest::where('enforcer_id', $enforcerId)
            ->orderByDesc('bypass_id')
            ->first();

        $active = FaceBypassRequest::where('enforcer_id', $enforcerId)
            ->usable()
            ->orderByDesc('bypass_id')
            ->first();

        return response()->json([
            'has_active_bypass' => (bool) $active,
            'active_bypass'     => $active,
            'latest_request'    => $latest,
        ]);
    }

    /**
     * POST /api/face-bypass/consume
     *
     * Called by the mobile app right after a successful fingerprint
     * time-in/out when using a bypass. Marks the approval as used so
     * the next tap requires a fresh request.
     */
    public function consume(Request $request)
    {
        $enforcerId = $request->user()->user_id;

        $bypass = FaceBypassRequest::where('enforcer_id', $enforcerId)
            ->usable()
            ->orderByDesc('bypass_id')
            ->first();

        if (!$bypass) {
            return response()->json([
                'message' => 'No active bypass to consume.',
            ], 404);
        }

        $bypass->update([
            'status'  => 'used',
            'used_at' => now(),
        ]);

        return response()->json([
            'message' => 'Bypass consumed.',
            'bypass'  => $bypass->fresh(),
        ]);
    }

    /* ================================================================
     | WEB ADMIN — review side
     ================================================================ */

    /**
     * GET /api/face-bypass/requests?status=pending|approved|...
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $page    = (int) $request->get('page', 1);

        $query = FaceBypassRequest::with(['enforcer', 'reviewer'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('enforcer_id')) {
            $query->where('enforcer_id', $request->enforcer_id);
        }

        $requests = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json($requests);
    }

    /**
     * GET /api/face-bypass/pending-count
     */
    public function pendingCount()
    {
        return response()->json([
            'count' => FaceBypassRequest::pending()->count(),
        ]);
    }

    /**
     * PUT /api/face-bypass/{id}/approve
     */
    public function approve(Request $request, $id)
    {
        $bypass = FaceBypassRequest::findOrFail($id);

        if ($bypass->status !== 'pending') {
            return response()->json([
                'message' => "This request is already {$bypass->status}.",
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'review_notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $admin = $request->user();

        $bypass->update([
            'status'       => 'approved',
            'reviewed_by'  => $admin->user_id,
            'reviewed_at'  => now(),
            'review_notes' => $request->review_notes,
        ]);

        try {
            NotificationService::notifyUser(
                $bypass->enforcer_id,
                'Bypass Approved',
                'Your fingerprint bypass has been approved. The next time-in will use fingerprint authentication.',
                Notification::TYPE_FACE_BYPASS_APPROVED,
                'user',
                $bypass->enforcer_id
            );

            $adminName = trim("{$admin->firstname} {$admin->lastname}");
            NotificationService::notifyAdmins(
                'Face Bypass Approved',
                "{$adminName} approved a bypass for " .
                    ($bypass->enforcer
                        ? trim("{$bypass->enforcer->firstname} {$bypass->enforcer->lastname}")
                        : 'an enforcer'),
                Notification::TYPE_FACE_BYPASS_APPROVED,
                'user',
                $bypass->enforcer_id
            );
        } catch (\Throwable $ne) {
            Log::warning('Face bypass approve notification failed: ' . $ne->getMessage());
        }

        return response()->json([
            'message' => 'Bypass approved.',
            'request' => $bypass->fresh(['enforcer', 'reviewer']),
        ]);
    }

    /**
     * PUT /api/face-bypass/{id}/reject
     */
    public function reject(Request $request, $id)
    {
        $bypass = FaceBypassRequest::findOrFail($id);

        if ($bypass->status !== 'pending') {
            return response()->json([
                'message' => "This request is already {$bypass->status}.",
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'review_notes' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $admin = $request->user();

        $bypass->update([
            'status'       => 'rejected',
            'reviewed_by'  => $admin->user_id,
            'reviewed_at'  => now(),
            'review_notes' => $request->review_notes,
        ]);

        try {
            NotificationService::notifyUser(
                $bypass->enforcer_id,
                'Bypass Rejected',
                "Your fingerprint bypass request was rejected. Reason: {$request->review_notes}",
                Notification::TYPE_FACE_BYPASS_REJECTED,
                'user',
                $bypass->enforcer_id
            );
        } catch (\Throwable $ne) {
            Log::warning('Face bypass reject notification failed: ' . $ne->getMessage());
        }

        return response()->json([
            'message' => 'Bypass rejected.',
            'request' => $bypass->fresh(['enforcer', 'reviewer']),
        ]);
    }
}