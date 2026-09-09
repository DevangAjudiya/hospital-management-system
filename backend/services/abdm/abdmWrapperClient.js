const axios = require('axios');
const crypto = require('crypto');

class AbdmWrapperClient {
    constructor() {
        this.baseUrl = process.env.ABDM_WRAPPER_URL || 'http://localhost:8082';
        this.hiuId = process.env.ABDM_HIU_ID || 'mock-hiu-id';
        this.hipId = process.env.ABDM_HIP_ID || 'mock-hip-id';
    }

    /**
     * Helper to perform standardized wrapper requests
     */
    async _request(method, endpoint, payload, headers = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const response = await axios({
                method,
                url,
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            });
            return {
                success: true,
                data: response.data,
                status: response.status
            };
        } catch (error) {
            // Safely log without exposing full medical payload or credentials
            console.error(`[ABDM Wrapper Error] ${method} ${endpoint} failed. Status: ${error.response?.status}`);
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status || 500
            };
        }
    }

    /**
     * Initiates a consent request from HIU
     */
    async initiateConsent(consentParams) {
        if (!consentParams.abhaAddress) {
            return { success: false, error: "Missing required abhaAddress", status: 400 };
        }
        if (!consentParams.careContexts || !Array.isArray(consentParams.careContexts)) {
            return { success: false, error: "Missing required careContexts array", status: 400 };
        }

        const requestId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const payload = {
            requestId,
            timestamp,
            consent: {
                purpose: consentParams.purpose || { text: "Care Management", code: "CAREMGT", refUri: "wrapper" },
                patient: { id: consentParams.abhaAddress },
                hip: { id: consentParams.hipId || this.hipId },
                hiu: { id: this.hiuId },
                requester: consentParams.requester || {
                    name: "Dr. Mock",
                    identifier: { type: "REGNO", value: "12345", system: "https://www.mciindia.org" }
                },
                hiTypes: consentParams.hiTypes || ["DiagnosticReport"],
                permission: consentParams.permission || {
                    accessMode: "VIEW",
                    dateRange: { 
                        from: new Date(Date.now() - 30*24*60*60*1000).toISOString(), 
                        to: new Date().toISOString() 
                    },
                    dataEraseAt: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                    frequency: { unit: "HOUR", value: 1, repeats: 0 }
                },
                careContexts: consentParams.careContexts
            }
        };

        const result = await this._request('POST', '/v1/consent-init', payload, {
            'X-HIU-ID': this.hiuId
        });

        return { ...result, requestId };
    }

    /**
     * Requests health information for a granted consent
     */
    async requestHealthInformation(consentId) {
        if (!consentId) {
            return { success: false, error: "Missing required consentId", status: 400 };
        }

        const requestId = crypto.randomUUID();
        
        const payload = {
            requestId,
            consentId,
            requesterId: this.hiuId
        };

        const result = await this._request('POST', '/v1/health-information/fetch-records', payload, {
             'X-HIU-ID': this.hiuId
        });

        return { ...result, requestId };
    }
}

module.exports = new AbdmWrapperClient();
