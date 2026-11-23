<?php

namespace App\Http\Requests;

use App\Rules\MaxCustomerAttachmentBytes;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerAttachmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:10240', new MaxCustomerAttachmentBytes(), 'mimetypes:application/pdf,image/jpeg,image/png', 'extensions:pdf,jpg,jpeg,png'],
        ];
    }
}
