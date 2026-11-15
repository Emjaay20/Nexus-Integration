package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// PriceBreak represents a quantity tier price in USD/EUR.
type PriceBreak struct {
	Qty       int     `json:"qty"`
	UnitPrice float64 `json:"unit_price_usd"`
}

// DistributorOffer represents a single distributor's quote and stock for an MPN.
type DistributorOffer struct {
	Distributor     string       `json:"distributor"`
	Sku             string       `json:"sku"`
	Mpn             string       `json:"mpn"`
	Manufacturer    string       `json:"manufacturer"`
	Description     string       `json:"description"`
	Package         string       `json:"package"`
	LifecycleStatus string       `json:"lifecycle_status"` // Active, NRND, EOL, Obsolete
	StockQty        int          `json:"stock_qty"`
	Moq             int          `json:"moq"`
	LeadTimeWeeks   int          `json:"lead_time_weeks"`
	PriceBreaks     []PriceBreak `json:"price_breaks"`
	DatasheetUrl    string       `json:"datasheet_url,omitempty"`
	Source          string       `json:"source"` // "digikey_api", "mouser_api", "nexar_api", "catalog_verified"
	FetchedAt       string       `json:"fetched_at,omitempty"`
}

// PartEnrichmentResult aggregates multi-distributor offers, best pricing, and risk signals for an MPN.
type PartEnrichmentResult struct {
	DataSource         string             `json:"data_source"`
	Warnings           []string           `json:"warnings"`
	QueryMpn           string             `json:"query_mpn"`
	NormalizedMpn      string             `json:"normalized_mpn"`
	Manufacturer       string             `json:"manufacturer"`
	Category           string             `json:"category"`
	Description        string             `json:"description"`
	Package            string             `json:"package"`
	LifecycleStatus    string             `json:"lifecycle_status"`
	TotalStock         int                `json:"total_stock"`
	DistributorCount   int                `json:"distributor_count"`
	BestUnitPriceAtQty float64            `json:"best_unit_price_at_qty"`
	BestDistributor    string             `json:"best_distributor"`
	MinLeadTimeWeeks   int                `json:"min_lead_time_weeks"`
	MaxLeadTimeWeeks   int                `json:"max_lead_time_weeks"`
	IsSingleSource     bool               `json:"is_single_source"`
	Offers             []DistributorOffer `json:"offers"`
	ParametricSpecs    map[string]string  `json:"parametric_specs"`
	LatencyMicros      int64              `json:"latency_micros"`
}

type EnrichBatchRequest struct {
	Mpns            []string `json:"mpns"`
	TargetBatchSize int      `json:"target_batch_size"`
}

type EnrichBatchResponse struct {
	TargetBatchSize   int                    `json:"target_batch_size"`
	TotalPartsQueried int                    `json:"total_parts_queried"`
	WorkerConcurrency int                    `json:"worker_concurrency"`
	TotalLatencyMs    int64                  `json:"total_latency_ms"`
	Results           []PartEnrichmentResult `json:"results"`
	Engine            string                 `json:"engine"`
}

type CatalogPart struct {
	Mpn             string
	Manufacturer    string
	Category        string
	Description     string
	Package         string
	LifecycleStatus string
	Specs           map[string]string
	Offers          []DistributorOffer
}

type IngestServer struct {
	httpClient      *http.Client
	catalog         map[string]CatalogPart
	cache           sync.Map
	requestsTotal   atomic.Uint64
	partsEnriched   atomic.Uint64
	digikeyCalls    atomic.Uint64
	mouserCalls     atomic.Uint64
	nexarCalls      atomic.Uint64
	digikeyClientID string
	digikeySecret   string
	mouserApiKey    string
	nexarClientID   string
	nexarSecret     string
}

func NewIngestServer() *IngestServer {
	s := &IngestServer{
		httpClient: &http.Client{
			Timeout: 6 * time.Second,
		},
		catalog:         buildReferenceCatalog(),
		digikeyClientID: strings.TrimSpace(os.Getenv("DIGIKEY_CLIENT_ID")),
		digikeySecret:   strings.TrimSpace(os.Getenv("DIGIKEY_CLIENT_SECRET")),
		mouserApiKey:    strings.TrimSpace(os.Getenv("MOUSER_API_KEY")),
		nexarClientID:   strings.TrimSpace(os.Getenv("NEXAR_CLIENT_ID")),
		nexarSecret:     strings.TrimSpace(os.Getenv("NEXAR_CLIENT_SECRET")),
	}
	return s
}

func NormalizeMpn(raw string) string {
	cleaned := strings.ToUpper(strings.TrimSpace(raw))
	suffixes := []string{"-TR", "-REEL", "/NOPB", "+T", "#PBF", "-ND", "_T", "-CT"}
	for _, suf := range suffixes {
		if strings.HasSuffix(cleaned, suf) {
			cleaned = strings.TrimSuffix(cleaned, suf)
			break
		}
	}
	return cleaned
}

func unitPriceForQuantity(breaks []PriceBreak, qty int) float64 {
	if len(breaks) == 0 {
		return 0.0
	}
	if qty <= 0 {
		qty = 1
	}
	best := 0.0
	bestTier := 0
	for _, b := range breaks {
		if qty >= b.Qty && b.Qty > 0 && b.Qty >= bestTier && b.UnitPrice > 0 {
			best = b.UnitPrice
			bestTier = b.Qty
		}
	}
	return best
}

func (s *IngestServer) enrichSinglePart(ctx context.Context, rawMpn string, targetQty int) PartEnrichmentResult {
	start := time.Now()
	s.partsEnriched.Add(1)
	norm := NormalizeMpn(rawMpn)
	if targetQty <= 0 {
		targetQty = 100
	}

	var liveOffers []DistributorOffer
	var mu sync.Mutex
	var wg sync.WaitGroup
	warnings := []string{}
	if s.mouserApiKey == "" {
		warnings = append(warnings, "Mouser credentials not configured")
	}
	if s.digikeyClientID == "" || s.digikeySecret == "" {
		warnings = append(warnings, "DigiKey credentials not configured")
	}

	// 1. Concurrent live distributor queries when API keys are configured
	if s.mouserApiKey != "" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			offers, err := s.queryMouserLive(ctx, norm)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				warnings = append(warnings, "Mouser lookup failed; live data unavailable")
			} else {
				for _, offer := range offers {
					if NormalizeMpn(offer.Mpn) == norm {
						liveOffers = append(liveOffers, offer)
					}
				}
			}
		}()
	}

	if s.digikeyClientID != "" && s.digikeySecret != "" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			offers, err := s.queryDigiKeyLive(ctx, norm, targetQty)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				warnings = append(warnings, "DigiKey lookup failed; live data unavailable")
			} else {
				for _, offer := range offers {
					if NormalizeMpn(offer.Mpn) == norm {
						liveOffers = append(liveOffers, offer)
					}
				}
			}
		}()
	}

	wg.Wait()

	// 2. Merge or fall back to verified engineering catalog
	catPart, found := s.LookupCatalogPart(norm)
	offers := liveOffers
	if len(offers) == 0 {
		for _, o := range catPart.Offers {
			oCopy := o
			oCopy.FetchedAt = ""
			oCopy.Source = "reference_catalog"
			offers = append(offers, oCopy)
		}
	}

	dataSource := "live"
	if len(liveOffers) == 0 {
		dataSource = "reference"
		warnings = append(warnings, "Reference catalog only. Stock and prices are illustrative, not current supplier quotes.")
	}
	if len(offers) == 0 {
		dataSource = "unavailable"
		warnings = append(warnings, "No offers found for this part")
	}
	if len(liveOffers) > 0 {
		catPart.Manufacturer = liveOffers[0].Manufacturer
		catPart.Description = liveOffers[0].Description
		catPart.Package = liveOffers[0].Package
		catPart.LifecycleStatus = liveOffers[0].LifecycleStatus
	}
	totalStock := 0
	bestPrice := math.MaxFloat64
	bestDist := "None"
	minLead := 999
	maxLead := 0

	for _, o := range offers {
		totalStock += o.StockQty
		p := unitPriceForQuantity(o.PriceBreaks, targetQty)
		if targetQty >= o.Moq && p > 0 && p < bestPrice {
			bestPrice = p
			bestDist = o.Distributor
		}
		if o.LeadTimeWeeks < minLead {
			minLead = o.LeadTimeWeeks
		}
		if o.LeadTimeWeeks > maxLead {
			maxLead = o.LeadTimeWeeks
		}
	}
	if bestPrice == math.MaxFloat64 {
		bestPrice = 0.0
	}
	if minLead == 999 {
		minLead = 0
	}

	distributors := map[string]bool{}
	for _, offer := range offers {
		distributors[offer.Distributor] = true
	}
	isSingleSource := len(distributors) <= 1 || !found && len(liveOffers) <= 1

	return PartEnrichmentResult{
		DataSource:         dataSource,
		Warnings:           warnings,
		QueryMpn:           rawMpn,
		NormalizedMpn:      norm,
		Manufacturer:       catPart.Manufacturer,
		Category:           catPart.Category,
		Description:        catPart.Description,
		Package:            catPart.Package,
		LifecycleStatus:    catPart.LifecycleStatus,
		TotalStock:         totalStock,
		DistributorCount:   len(distributors),
		BestUnitPriceAtQty: math.Round(bestPrice*10000) / 10000,
		BestDistributor:    bestDist,
		MinLeadTimeWeeks:   minLead,
		MaxLeadTimeWeeks:   maxLead,
		IsSingleSource:     isSingleSource,
		Offers:             offers,
		ParametricSpecs:    catPart.Specs,
		LatencyMicros:      time.Since(start).Microseconds(),
	}
}

func (s *IngestServer) queryMouserLive(ctx context.Context, mpn string) ([]DistributorOffer, error) {
	s.mouserCalls.Add(1)
	endpoint := fmt.Sprintf("https://api.mouser.com/api/v1/search/partnumber?apiKey=%s", url.QueryEscape(s.mouserApiKey))
	payload := map[string]any{
		"SearchByPartRequest": map[string]any{
			"mouserPartNumber":  mpn,
			"partSearchOptions": "Exact",
		},
	}
	b, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mouser status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var parsed struct {
		SearchResults struct {
			Parts []struct {
				ManufacturerPartNumber string `json:"ManufacturerPartNumber"`
				MouserPartNumber       string `json:"MouserPartNumber"`
				Manufacturer           string `json:"Manufacturer"`
				Description            string `json:"Description"`
				LifecycleStatus        string `json:"LifecycleStatus"`
				AvailabilityInStock    string `json:"AvailabilityInStock"`
				DataSheetUrl           string `json:"DataSheetUrl"`
				PriceBreaks            []struct {
					Quantity int    `json:"Quantity"`
					Price    string `json:"Price"`
				} `json:"PriceBreaks"`
			} `json:"Parts"`
		} `json:"SearchResults"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	var out []DistributorOffer
	nowStr := time.Now().UTC().Format(time.RFC3339)
	for _, p := range parsed.SearchResults.Parts {
		var breaks []PriceBreak
		for _, pb := range p.PriceBreaks {
			var priceVal float64
			cleanPrice := strings.ReplaceAll(strings.TrimLeft(pb.Price, "$€£ "), ",", "")
			fmt.Sscanf(cleanPrice, "%f", &priceVal)
			if priceVal > 0 {
				breaks = append(breaks, PriceBreak{Qty: pb.Quantity, UnitPrice: priceVal})
			}
		}
		var stock int
		fmt.Sscanf(strings.ReplaceAll(p.AvailabilityInStock, ",", ""), "%d", &stock)
		lifecycle := "Active"
		if strings.Contains(strings.ToUpper(p.LifecycleStatus), "OBSOLETE") {
			lifecycle = "Obsolete"
		} else if strings.Contains(strings.ToUpper(p.LifecycleStatus), "NRND") {
			lifecycle = "NRND"
		}
		out = append(out, DistributorOffer{
			Distributor:     "Mouser Electronics",
			Sku:             p.MouserPartNumber,
			Mpn:             p.ManufacturerPartNumber,
			Manufacturer:    p.Manufacturer,
			Description:     p.Description,
			Package:         "Standard",
			LifecycleStatus: lifecycle,
			StockQty:        stock,
			Moq:             1,
			LeadTimeWeeks:   0,
			PriceBreaks:     breaks,
			DatasheetUrl:    p.DataSheetUrl,
			Source:          "mouser_api_live",
			FetchedAt:       nowStr,
		})
	}
	return out, nil
}

func (s *IngestServer) queryDigiKeyLive(ctx context.Context, mpn string, targetQty int) ([]DistributorOffer, error) {
	s.digikeyCalls.Add(1)
	// OAuth2 client_credentials token exchange against DigiKey Product Information v4
	form := url.Values{}
	form.Set("client_id", s.digikeyClientID)
	form.Set("client_secret", s.digikeySecret)
	form.Set("grant_type", "client_credentials")

	tokenReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.digikey.com/v1/oauth2/token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	tokenResp, err := s.httpClient.Do(tokenReq)
	if err != nil {
		return nil, err
	}
	defer tokenResp.Body.Close()
	if tokenResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("digikey token status %d", tokenResp.StatusCode)
	}
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(tokenResp.Body).Decode(&tok); err != nil || tok.AccessToken == "" {
		return nil, fmt.Errorf("invalid digikey token")
	}

	searchURL := fmt.Sprintf("https://api.digikey.com/products/v4/search/%s/productdetails", url.PathEscape(mpn))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	req.Header.Set("X-DIGIKEY-Client-Id", s.digikeyClientID)
	req.Header.Set("X-DIGIKEY-Locale-Site", "US")
	req.Header.Set("X-DIGIKEY-Locale-Language", "en")
	req.Header.Set("X-DIGIKEY-Locale-Currency", "USD")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("digikey details status %d", resp.StatusCode)
	}
	var details struct {
		Product struct {
			ManufacturerProductNumber string `json:"ManufacturerProductNumber"`
			QuantityAvailable         int    `json:"QuantityAvailable"`
			Manufacturer              struct {
				Name string `json:"Name"`
			} `json:"Manufacturer"`
			Description struct {
				ProductDescription string `json:"ProductDescription"`
			} `json:"Description"`
			ProductStatus struct {
				Status string `json:"Status"`
			} `json:"ProductStatus"`
			ProductVariations []struct {
				DigiKeyProductNumber            string `json:"DigiKeyProductNumber"`
				QuantityAvailableforPackageType int    `json:"QuantityAvailableforPackageType"`
				MinimumOrderQuantity            int    `json:"MinimumOrderQuantity"`
				PackageType                     struct {
					Name string `json:"Name"`
				} `json:"PackageType"`
				StandardPricing []struct {
					BreakQuantity int     `json:"BreakQuantity"`
					UnitPrice     float64 `json:"UnitPrice"`
				} `json:"StandardPricing"`
			} `json:"ProductVariations"`
		} `json:"Product"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&details); err != nil {
		return nil, err
	}
	var best *DistributorOffer
	bestPrice := math.MaxFloat64
	for _, variation := range details.Product.ProductVariations {
		var breaks []PriceBreak
		for _, sp := range variation.StandardPricing {
			breaks = append(breaks, PriceBreak{Qty: sp.BreakQuantity, UnitPrice: sp.UnitPrice})
		}
		price := unitPriceForQuantity(breaks, targetQty)
		if price <= 0 || targetQty < variation.MinimumOrderQuantity || price >= bestPrice {
			continue
		}
		bestPrice = price
		offer := DistributorOffer{Distributor: "DigiKey", Sku: variation.DigiKeyProductNumber, Mpn: details.Product.ManufacturerProductNumber,
			Manufacturer: details.Product.Manufacturer.Name, Description: details.Product.Description.ProductDescription,
			Package: variation.PackageType.Name, LifecycleStatus: details.Product.ProductStatus.Status, StockQty: variation.QuantityAvailableforPackageType,
			Moq: variation.MinimumOrderQuantity, PriceBreaks: breaks, Source: "digikey_api_live", FetchedAt: time.Now().UTC().Format(time.RFC3339)}
		best = &offer
	}
	if best == nil {
		return nil, fmt.Errorf("no DigiKey package pricing available at requested quantity")
	}
	return []DistributorOffer{*best}, nil
}

func (s *IngestServer) LookupCatalogPart(norm string) (CatalogPart, bool) {
	part, ok := s.catalog[norm]
	return part, ok
}

func buildReferenceCatalog() map[string]CatalogPart {
	return map[string]CatalogPart{
		"STM32F401RET6": {
			Mpn:             "STM32F401RET6",
			Manufacturer:    "STMicroelectronics",
			Category:        "Embedded Microcontrollers",
			Description:     "ARM Cortex-M4 32-bit MCU+FPU, 84 MHz, 512 KB Flash, 96 KB SRAM, USB OTG, 11 Timers",
			Package:         "LQFP-64 (10x10mm)",
			LifecycleStatus: "Active",
			Specs: map[string]string{
				"core":         "ARM Cortex-M4F",
				"clock_max":    "84 MHz",
				"flash":        "512 KB",
				"ram":          "96 KB",
				"supply_range": "1.7V - 3.6V",
				"temp_range":   "-40°C to +85°C",
				"package":      "LQFP-64",
				"rohs_status":  "RoHS3 Compliant",
			},
			Offers: []DistributorOffer{
				{
					Distributor:     "DigiKey",
					Sku:             "497-14362-1-ND",
					Mpn:             "STM32F401RET6",
					Manufacturer:    "STMicroelectronics",
					Description:     "IC MCU 32BIT 512KB FLASH 64LQFP",
					Package:         "LQFP-64",
					LifecycleStatus: "Active",
					StockQty:        8420,
					Moq:             1,
					LeadTimeWeeks:   18,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 5.45},
						{Qty: 100, UnitPrice: 4.38},
						{Qty: 1000, UnitPrice: 3.72},
						{Qty: 5000, UnitPrice: 3.29},
					},
					DatasheetUrl: "https://www.st.com/resource/en/datasheet/stm32f401re.pdf",
					Source:       "catalog_verified",
				},
				{
					Distributor:     "Mouser Electronics",
					Sku:             "511-STM32F401RET6",
					Mpn:             "STM32F401RET6",
					Manufacturer:    "STMicroelectronics",
					Description:     "ARM Microcontrollers - MCU 32B ARM Cortex-M4 512Kb Flash",
					Package:         "LQFP-64",
					LifecycleStatus: "Active",
					StockQty:        5190,
					Moq:             1,
					LeadTimeWeeks:   20,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 5.52},
						{Qty: 100, UnitPrice: 4.41},
						{Qty: 1000, UnitPrice: 3.68},
						{Qty: 5000, UnitPrice: 3.25},
					},
					DatasheetUrl: "https://www.st.com/resource/en/datasheet/stm32f401re.pdf",
					Source:       "catalog_verified",
				},
				{
					Distributor:     "Farnell / Element14",
					Sku:             "2420624",
					Mpn:             "STM32F401RET6",
					Manufacturer:    "STMicroelectronics",
					Description:     "MCU, 32BIT, CORTEX-M4, 84MHZ, LQFP-64",
					Package:         "LQFP-64",
					LifecycleStatus: "Active",
					StockQty:        1920,
					Moq:             1,
					LeadTimeWeeks:   16,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 5.60},
						{Qty: 100, UnitPrice: 4.50},
						{Qty: 1000, UnitPrice: 3.79},
					},
					Source: "catalog_verified",
				},
			},
		},
		"GD32F405RGT6": {
			Mpn:             "GD32F405RGT6",
			Manufacturer:    "GigaDevice Semiconductor",
			Category:        "Embedded Microcontrollers",
			Description:     "ARM Cortex-M4 32-bit MCU, 168 MHz, 1024 KB Flash, 192 KB SRAM, Pin-Compatible STM32F4 Drop-In",
			Package:         "LQFP-64 (10x10mm)",
			LifecycleStatus: "Active",
			Specs: map[string]string{
				"core":         "ARM Cortex-M4F",
				"clock_max":    "168 MHz",
				"flash":        "1024 KB",
				"ram":          "192 KB",
				"supply_range": "2.6V - 3.6V",
				"temp_range":   "-40°C to +85°C",
				"package":      "LQFP-64",
			},
			Offers: []DistributorOffer{
				{
					Distributor:     "DigiKey",
					Sku:             "3170-GD32F405RGT6-ND",
					Mpn:             "GD32F405RGT6",
					Manufacturer:    "GigaDevice",
					Description:     "IC MCU 32BIT 1MB FLASH 64LQFP",
					Package:         "LQFP-64",
					LifecycleStatus: "Active",
					StockQty:        19400,
					Moq:             1,
					LeadTimeWeeks:   0,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 3.65},
						{Qty: 100, UnitPrice: 2.95},
						{Qty: 1000, UnitPrice: 2.48},
						{Qty: 5000, UnitPrice: 2.21},
					},
					Source: "catalog_verified",
				},
				{
					Distributor:     "LCSC / Mouser",
					Sku:             "C74210",
					Mpn:             "GD32F405RGT6",
					Manufacturer:    "GigaDevice",
					Description:     "32-bit ARM Cortex-M4 Microcontroller LQFP-64",
					Package:         "LQFP-64",
					LifecycleStatus: "Active",
					StockQty:        24500,
					Moq:             1,
					LeadTimeWeeks:   4,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 3.40},
						{Qty: 100, UnitPrice: 2.82},
						{Qty: 1000, UnitPrice: 2.39},
					},
					Source: "catalog_verified",
				},
			},
		},
		"LM1117-3.3": {
			Mpn:             "LM1117-3.3",
			Manufacturer:    "Texas Instruments",
			Category:        "PMIC - LDO Voltage Regulators",
			Description:     "800-mA Low-Dropout Linear Regulator, Fixed 3.3V Output, SOT-223",
			Package:         "SOT-223-4",
			LifecycleStatus: "Active",
			Specs: map[string]string{
				"output_voltage": "3.3 V",
				"output_current": "800 mA",
				"dropout_max":    "1.2 V @ 800mA",
				"input_max":      "15 V",
				"package":        "SOT-223-4",
			},
			Offers: []DistributorOffer{
				{
					Distributor:     "DigiKey",
					Sku:             "LM1117MPX-3.3/NOPBCT-ND",
					Mpn:             "LM1117-3.3",
					Manufacturer:    "Texas Instruments",
					Description:     "IC REG LINEAR 3.3V 800MA SOT223",
					Package:         "SOT-223-4",
					LifecycleStatus: "Active",
					StockQty:        42100,
					Moq:             1,
					LeadTimeWeeks:   0,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 0.78},
						{Qty: 100, UnitPrice: 0.49},
						{Qty: 1000, UnitPrice: 0.34},
						{Qty: 5000, UnitPrice: 0.28},
					},
					Source: "catalog_verified",
				},
				{
					Distributor:     "Mouser Electronics",
					Sku:             "926-LM1117MPX33NOPB",
					Mpn:             "LM1117-3.3",
					Manufacturer:    "Texas Instruments",
					Description:     "LDO Voltage Regulators 800mA Low-Dropout Linear Regulator",
					Package:         "SOT-223-4",
					LifecycleStatus: "Active",
					StockQty:        38900,
					Moq:             1,
					LeadTimeWeeks:   0,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 0.79},
						{Qty: 100, UnitPrice: 0.48},
						{Qty: 1000, UnitPrice: 0.33},
					},
					Source: "catalog_verified",
				},
			},
		},
		"RC0603FR-0710KL": {
			Mpn:             "RC0603FR-0710KL",
			Manufacturer:    "Yageo",
			Category:        "Chip Resistors - Surface Mount",
			Description:     "Thick Film Resistor 10 kOhm ±1% 0.1W (1/10W) 0603 (1608 Metric) Moisture Resistant",
			Package:         "0603 (1608 Metric)",
			LifecycleStatus: "Active",
			Specs: map[string]string{
				"resistance": "10 kOhm",
				"tolerance":  "±1%",
				"power":      "0.1W (1/10W)",
				"tcr":        "±100ppm/°C",
				"package":    "0603",
			},
			Offers: []DistributorOffer{
				{
					Distributor:     "DigiKey",
					Sku:             "311-10.0KHRCT-ND",
					Mpn:             "RC0603FR-0710KL",
					Manufacturer:    "Yageo",
					Description:     "RES SMD 10K OHM 1% 1/10W 0603",
					Package:         "0603",
					LifecycleStatus: "Active",
					StockQty:        1850000,
					Moq:             1,
					LeadTimeWeeks:   4,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 0.01},
						{Qty: 100, UnitPrice: 0.0038},
						{Qty: 5000, UnitPrice: 0.0019},
					},
					Source: "catalog_verified",
				},
				{
					Distributor:     "Mouser Electronics",
					Sku:             "603-RC0603FR-0710KL",
					Mpn:             "RC0603FR-0710KL",
					Manufacturer:    "Yageo",
					Description:     "Thick Film Resistors - SMD 10K OHM 1% 1/10W",
					Package:         "0603",
					LifecycleStatus: "Active",
					StockQty:        2400000,
					Moq:             1,
					LeadTimeWeeks:   4,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 0.01},
						{Qty: 100, UnitPrice: 0.0036},
						{Qty: 5000, UnitPrice: 0.0018},
					},
					Source: "catalog_verified",
				},
			},
		},
		"GRM188R71H104KA93D": {
			Mpn:             "GRM188R71H104KA93D",
			Manufacturer:    "Murata Electronics",
			Category:        "Multilayer Ceramic Capacitors (MLCC)",
			Description:     "0.1 µF (100nF) ±10% 50V Ceramic Capacitor X7R 0603 (1608 Metric)",
			Package:         "0603 (1608 Metric)",
			LifecycleStatus: "Active",
			Specs: map[string]string{
				"capacitance":   "100 nF (0.1 µF)",
				"voltage_rated": "50 V",
				"dielectric":    "X7R",
				"tolerance":     "±10%",
				"package":       "0603",
			},
			Offers: []DistributorOffer{
				{
					Distributor:     "DigiKey",
					Sku:             "490-1519-1-ND",
					Mpn:             "GRM188R71H104KA93D",
					Manufacturer:    "Murata Electronics",
					Description:     "CAP CER 0.1UF 50V X7R 0603",
					Package:         "0603",
					LifecycleStatus: "Active",
					StockQty:        940000,
					Moq:             1,
					LeadTimeWeeks:   5,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 0.018},
						{Qty: 100, UnitPrice: 0.0085},
						{Qty: 4000, UnitPrice: 0.0044},
					},
					Source: "catalog_verified",
				},
				{
					Distributor:     "Mouser Electronics",
					Sku:             "81-GRM188R71H104KA93D",
					Mpn:             "GRM188R71H104KA93D",
					Manufacturer:    "Murata Electronics",
					Description:     "MLCC 0.1uF 50V X7R 10% 0603",
					Package:         "0603",
					LifecycleStatus: "Active",
					StockQty:        1120000,
					Moq:             1,
					LeadTimeWeeks:   5,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 0.019},
						{Qty: 100, UnitPrice: 0.0082},
						{Qty: 4000, UnitPrice: 0.0042},
					},
					Source: "catalog_verified",
				},
			},
		},
		"TPS62130RGTR": {
			Mpn:             "TPS62130RGTR",
			Manufacturer:    "Texas Instruments",
			Category:        "PMIC - Buck Switching Regulators",
			Description:     "3V-17V 3A Step-Down Converter in 3x3 VQFN-16 with DCS-Control",
			Package:         "VQFN-16 (3x3mm)",
			LifecycleStatus: "Active",
			Specs: map[string]string{
				"input_voltage":  "3V to 17V",
				"output_current": "3A",
				"topology":       "Buck Step-Down",
				"package":        "VQFN-16",
			},
			Offers: []DistributorOffer{
				{
					Distributor:     "DigiKey",
					Sku:             "296-29848-1-ND",
					Mpn:             "TPS62130RGTR",
					Manufacturer:    "Texas Instruments",
					Description:     "IC REG BUCK ADJ 3A 16VQFN",
					Package:         "VQFN-16",
					LifecycleStatus: "Active",
					StockQty:        14200,
					Moq:             1,
					LeadTimeWeeks:   8,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 2.35},
						{Qty: 100, UnitPrice: 1.72},
						{Qty: 1000, UnitPrice: 1.38},
					},
					Source: "catalog_verified",
				},
				{
					Distributor:     "Mouser Electronics",
					Sku:             "595-TPS62130RGTR",
					Mpn:             "TPS62130RGTR",
					Manufacturer:    "Texas Instruments",
					Description:     "Switching Voltage Regulators 3-17V 3A Step-Down",
					Package:         "VQFN-16",
					LifecycleStatus: "Active",
					StockQty:        9850,
					Moq:             1,
					LeadTimeWeeks:   8,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 2.38},
						{Qty: 100, UnitPrice: 1.70},
						{Qty: 1000, UnitPrice: 1.35},
					},
					Source: "catalog_verified",
				},
			},
		},
		"OPA2350UA": {
			Mpn:             "OPA2350UA",
			Manufacturer:    "Texas Instruments",
			Category:        "Linear - Operational Amplifiers",
			Description:     "High-Speed, Single-Supply, Rail-to-Rail Operational Amplifier Dual SOIC-8 (NRND Notice)",
			Package:         "SOIC-8",
			LifecycleStatus: "NRND",
			Specs: map[string]string{
				"gbw":          "38 MHz",
				"slew_rate":    "22 V/µs",
				"supply_range": "2.7V to 5.5V",
				"package":      "SOIC-8",
			},
			Offers: []DistributorOffer{
				{
					Distributor:     "DigiKey",
					Sku:             "OPA2350UA-ND",
					Mpn:             "OPA2350UA",
					Manufacturer:    "Texas Instruments",
					Description:     "IC OPAMP GP 2 CIRCUIT 8SOIC",
					Package:         "SOIC-8",
					LifecycleStatus: "NRND",
					StockQty:        310,
					Moq:             1,
					LeadTimeWeeks:   28,
					PriceBreaks: []PriceBreak{
						{Qty: 1, UnitPrice: 4.15},
						{Qty: 100, UnitPrice: 3.60},
					},
					Source: "catalog_verified",
				},
			},
		},
	}
}

func (s *IngestServer) EnrichBatch(ctx context.Context, mpns []string, targetBatchSize int) EnrichBatchResponse {
	start := time.Now()
	s.requestsTotal.Add(1)
	if targetBatchSize <= 0 {
		targetBatchSize = 100
	}

	concurrency := 8
	if len(mpns) < concurrency {
		concurrency = len(mpns)
	}
	if concurrency < 1 {
		concurrency = 1
	}

	type job struct {
		idx int
		mpn string
	}
	jobs := make(chan job, len(mpns))
	results := make([]PartEnrichmentResult, len(mpns))

	var wg sync.WaitGroup
	for w := 0; w < concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				results[j.idx] = s.enrichSinglePart(ctx, j.mpn, targetBatchSize)
			}
		}()
	}

	for idx, mpn := range mpns {
		jobs <- job{idx: idx, mpn: mpn}
	}
	close(jobs)
	wg.Wait()

	return EnrichBatchResponse{
		TargetBatchSize:   targetBatchSize,
		TotalPartsQueried: len(mpns),
		WorkerConcurrency: concurrency,
		TotalLatencyMs:    time.Since(start).Milliseconds(),
		Results:           results,
		Engine:            "nexus-go-ingest/1.0 (Bounded Worker Pool)",
	}
}

func (s *IngestServer) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":               "healthy",
		"service":              "nexus-go-ingest",
		"runtime":              "go",
		"catalog_parts_loaded": len(s.catalog),
		"live_connectors": map[string]bool{
			"digikey_v4": s.digikeyClientID != "" && s.digikeySecret != "",
			"mouser_v1":  s.mouserApiKey != "",
			"nexar_gql":  false,
		},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *IngestServer) handleMetrics(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	fmt.Fprintf(w, "# HELP ingest_requests_total Total batch enrichment requests processed\n")
	fmt.Fprintf(w, "# TYPE ingest_requests_total counter\n")
	fmt.Fprintf(w, "ingest_requests_total %d\n", s.requestsTotal.Load())
	fmt.Fprintf(w, "# HELP ingest_parts_enriched_total Total individual MPNs enriched\n")
	fmt.Fprintf(w, "# TYPE ingest_parts_enriched_total counter\n")
	fmt.Fprintf(w, "ingest_parts_enriched_total %d\n", s.partsEnriched.Load())
	fmt.Fprintf(w, "# HELP ingest_distributor_calls_total Live distributor API calls\n")
	fmt.Fprintf(w, "# TYPE ingest_distributor_calls_total counter\n")
	fmt.Fprintf(w, "ingest_distributor_calls_total{distributor=\"digikey\"} %d\n", s.digikeyCalls.Load())
	fmt.Fprintf(w, "ingest_distributor_calls_total{distributor=\"mouser\"} %d\n", s.mouserCalls.Load())
	fmt.Fprintf(w, "ingest_distributor_calls_total{distributor=\"nexar\"} %d\n", s.nexarCalls.Load())
}

func (s *IngestServer) handleEnrichBatch(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	requestID := r.Header.Get("X-Request-ID")
	validID := len(requestID) == 36
	for _, c := range requestID {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || c == '-') {
			validID = false
		}
	}
	if !validID {
		b := make([]byte, 16)
		if _, err := rand.Read(b); err == nil {
			requestID = hex.EncodeToString(b)
		} else {
			requestID = "unavailable"
		}
	}
	w.Header().Set("X-Request-ID", requestID)
	defer func() {
		slog.Info("enrichment request completed", "request_id", requestID, "elapsed_ms", time.Since(start).Milliseconds())
	}()
	r.Body = http.MaxBytesReader(w, r.Body, 1_000_000)

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req EnrichBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}
	if len(req.Mpns) == 0 || len(req.Mpns) > 500 || req.TargetBatchSize < 1 {
		http.Error(w, "Provide 1–500 parts and a positive target quantity", http.StatusBadRequest)
		return
	}
	resp := s.EnrichBatch(r.Context(), req.Mpns, req.TargetBatchSize)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (s *IngestServer) handleCatalogList(w http.ResponseWriter, _ *http.Request) {
	keys := make([]string, 0, len(s.catalog))
	for k := range s.catalog {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var items []PartEnrichmentResult
	for _, k := range keys {
		items = append(items, s.enrichSinglePart(context.Background(), k, 100))
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"count": len(items),
		"items": items,
	})
}

func (s *IngestServer) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/metrics", s.handleMetrics)
	mux.HandleFunc("/api/v1/ingest/enrich-batch", s.handleEnrichBatch)
	mux.HandleFunc("/api/v1/ingest/catalog", s.handleCatalogList)
	return mux
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	port := os.Getenv("INGEST_PORT")
	if port == "" {
		port = os.Getenv("PORT")
	}
	if port == "" {
		port = "8090"
	}

	srv := NewIngestServer()
	host := os.Getenv("INGEST_HOST")
	if host == "" {
		host = "0.0.0.0"
	}
	addr := host + ":" + port
	slog.Info("starting nexus-go-ingest service", "addr", addr)
	if err := http.ListenAndServe(addr, srv.Routes()); err != nil {
		slog.Error("server exited", "err", err)
		os.Exit(1)
	}
}
