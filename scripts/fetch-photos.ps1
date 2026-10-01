$ErrorActionPreference = 'Stop'
$photoRoot = Join-Path $PSScriptRoot '../assets/photos'
New-Item -ItemType Directory -Force -Path $photoRoot | Out-Null
$destinations = @(
    @{ id='london'; title='Tower Bridge'; caption='런던 타워 브리지' },
    @{ id='paris'; title='Pont Alexandre III'; caption='파리 알렉상드르 3세 다리' },
    @{ id='annecy'; title='Thiou'; caption='안시 구시가지의 티우 운하' },
    @{ id='south-france'; title='Promenade des Anglais'; caption='니스 프롬나드 데 장글레' },
    @{ id='italy'; title='Colosseum'; caption='로마 콜로세움' },
    @{ id='switzerland'; title='Lauterbrunnen'; caption='스위스 라우터브루넨' },
    @{ id='austria'; title='Hallstatt'; caption='오스트리아 할슈타트' },
    @{ id='croatia'; title='Dubrovnik'; caption='크로아티아 두브로브니크' },
    @{ id='china'; title='Great Wall of China'; caption='중국 만리장성' },
    @{ id='thailand'; title='Wat Arun'; caption='방콕 왓 아룬' },
    @{ id='japan'; title='Mount Fuji'; caption='일본 후지산' },
    @{ id='taiwan'; title='Jiufen'; caption='대만 지우펀' },
    @{ id='portugal'; title='Belém Tower'; caption='리스본 벨렝탑' },
    @{ id='slovenia'; title='Lake Bled'; caption='슬로베니아 블레드 호수' },
    @{ id='norway'; title='Bryggen'; caption='베르겐 브뤼겐' },
    @{ id='newzealand'; title='Lake Wakatipu'; caption='뉴질랜드 와카티푸 호수' }
)
$headers = @{ 'User-Agent'='TravelPagesAssetBuilder/1.0 (personal travel website; image credit collection)' }
$photos = @()
$previous = @()
if (Test-Path -LiteralPath (Join-Path $photoRoot 'sources.json')) { $previous = Get-Content -Raw -LiteralPath (Join-Path $photoRoot 'sources.json') | ConvertFrom-Json }
function Get-PhotoJson($url) {
    for ($attempt=0; $attempt -lt 4; $attempt++) {
        try { return Invoke-RestMethod -Uri $url -Headers $headers } catch {
            if ($attempt -eq 3) { throw }
            Start-Sleep -Seconds 5
        }
    }
}
$titles = ($destinations | ForEach-Object { $_.title }) -join '|'
$query = 'https://en.wikipedia.org/w/api.php?action=query&redirects=1&prop=pageimages&format=json&piprop=name%7Cthumbnail&pithumbsize=1280&titles=' + [uri]::EscapeDataString($titles)
$pages = (Get-PhotoJson $query).query.pages.PSObject.Properties.Value
foreach ($place in $destinations) { if ($place.file) { ($pages | Where-Object { $_.title -eq $place.title }).pageimage = $place.file } }
$fileTitles = ($pages | ForEach-Object { 'File:' + $_.pageimage }) -join '|'
$metadataUrl = 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1280&format=json&titles=' + [uri]::EscapeDataString($fileTitles)
$imagePages = (Get-PhotoJson $metadataUrl).query.pages.PSObject.Properties.Value
foreach ($place in $destinations) {
    $page = $pages | Where-Object { $_.title -eq $place.title } | Select-Object -First 1
    if (!$page.pageimage) { throw "No photo for $($place.title)" }
    $imagePage = $imagePages | Where-Object { $_.title.Replace('_',' ') -eq ('File:' + $page.pageimage).Replace('_',' ') } | Select-Object -First 1
    $metadata = $imagePage.imageinfo[0]
    if (!$metadata) { throw "No license metadata for $($place.title)" }
    if ($place.file) { $page.thumbnail.source=$metadata.thumburl; $page.thumbnail.width=$metadata.thumbwidth; $page.thumbnail.height=$metadata.thumbheight }
    $license = $metadata.extmetadata.LicenseShortName.value
    if ($license -notmatch 'CC BY|CC0|Public domain') { throw "Review license: $license" }
    $ext = [IO.Path]::GetExtension($page.pageimage).ToLower()
    if ($ext -notin '.jpg','.jpeg','.png') { throw "Unexpected image type: $ext" }
    $outputFile = Join-Path $photoRoot ($place.id + $ext)
    $prior = $previous | Where-Object { $_.id -eq $place.id } | Select-Object -First 1
    if (!(Test-Path -LiteralPath $outputFile) -or $prior.title -ne $page.pageimage) { Invoke-WebRequest -Uri $page.thumbnail.source -Headers $headers -OutFile $outputFile }
    $photo = [ordered]@{id=$place.id;caption=$place.caption;file=('assets/photos/' + $place.id + $ext);title=$page.pageimage;source=$metadata.descriptionurl;authorHtml=$metadata.extmetadata.Artist.value;license=$license;licenseUrl=$metadata.extmetadata.LicenseUrl.value;descriptionHtml=$metadata.extmetadata.ImageDescription.value;downloadUrl=$page.thumbnail.source;width=$page.thumbnail.width;height=$page.thumbnail.height}
    $photos += $photo
    $photos | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $photoRoot 'sources.json') -Encoding utf8
    Write-Output "$($place.id): $($page.pageimage) | $license | $($page.thumbnail.width)x$($page.thumbnail.height)"
}
