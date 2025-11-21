@include('layout.head')


<!-- HEADLINE -->
@if(count($headline)>0)
    <div id="carousel" class="d-block" style="margin-top:80px; margin-bottom:80px">
        <div class="container">
            <div id="carouselExampleIndicators" class="carousel slide rounded-4 overflow-hidden" data-bs-ride="true">
                <div class="carousel-indicators">
                    @foreach ($headline as $key=>$head)
                        <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="{{$key}}" class="{{$key==0?"active":""}}" aria-current="true" aria-label="Slide {{$key+1}}"></button>
                    @endforeach
                </div>
                <div class="carousel-inner">
                    @foreach ($headline as $key=>$head)
                        <div class="carousel-item {{$key==0?"active":""}}">
                            <img 
                                src="{{env("EWS_API")}}/storage/{{$head['gambar']}}" 
                                class="img-fluid"
                                title="{{$head['judul']}}"
                            />
                        </div>
                    @endforeach
                </div>
            </div>  
        </div>
    </div>
@else
    <div style="margin-top: 80px; margin-bottom:80px"></div>
@endif

<!-- FEATURE COLUMN -->
<div id="column-feature" class='d-block' style="margin-bottom:80px">
    <div class='container'>
        <div class='d-flex mb-4'>
            <div class="pricing-header p-3 pb-md-4 mx-auto text-center">
                <h2 class="block-title fw-semibold text-success">{{$feature_column['title']}}</h2>
                <p class="fs-5 text-secondary">{{$feature_column['sub_title']}}</p>
            </div>
        </div>
        <div class="row">
            @foreach ($feature_column['data'] as $fc)
                <div class="col-lg-3 mb-3">
                    <div class="card rounded-4 h-100">
                        <div class="card-body px-3">
                            <div class='d-flex flex-column align-items-center'>
                                <div class="px-3 d-flex justify-content-center">
                                    <img 
                                        src="{{env("EWS_API")}}/storage/{{$fc['gambar']}}"
                                        class="img-fluid"
                                    />
                                </div>

                                <h4 class="fw-normal mt-4 fw-semibold">{{$fc['judul']}}</h4>
                                <p class='text-secondary text-center mt-2'>{{$fc['deskripsi']}}</p>
                            </div>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    </div>
</div>

<!-- FEATURE ROW -->
@foreach($feature_row as $fr)
    <div id="row-feature" class='d-block' style="margin-bottom:80px">
        <div class='container'>
            <div class='d-flex flex-column flex-md-row align-items-center'>
                <div class='col-md-5 feature-graph'>
                    <img
                        src="{{env("EWS_API")}}/storage/{{$fr['gambar']}}"
                        class="img-fluid"
                    />
                </div>
                <div class='col-md-6 feature-caption ps-5'>
                    <h2 class="block-title fw-semibold text-success">{{$fr['judul']}}</h2>
                    <p class="mt-3 text-secondary">{{$fr['content']}}</p>
                    <a href="{{$fr['link_to']}}" class='btn btn-outline-success rounded-pill mt-3'>Selengkapnya</a>
                </div>
            </div>
        </div>
    </div>
@endforeach

@if(count($posts_new)>0)
    <div id="column-post" class='d-block' style="margin-bottom:80px">
        <div class='container'>
            <div class='d-flex mb-4'>
                <div class="pricing-header p-3 pb-md-4 mx-auto text-center">
                    <h2 class="block-title fw-semibold text-success">Informasi Terbaru</h2>
                    <p class="fs-5 text-secondary">Artikel Terbaru Dari Kami.</p>
                </div>
            </div>
            <div class="row horizontal-scrollable flex-nowrap flex-md-wrap mb-4">
                @foreach($posts_new as $pn)
                    <div class='col-10 col-md-4 mb-4'>
                        <div class="card border-0 rounded-4 overflow-hidden">
                            <div class='blog-img rounded'>
                                <img
                                    src="{{env("EWS_API")}}/storage/{{$pn['data']['featured_image']}}"
                                    class="img-fluid"
                                />
                            </div>
                            <div class="card-body border-0">
                                <h4 class='fw-semibold post-title text-dark'>
                                    <a 
                                        class='link-dark text-decoration-none' 
                                        href="/post/{{$pn['id_frontpage']}}/{{slugify($pn['data']['title'])}}"
                                    >
                                        {{$pn['data']['title']}}
                                    </a>
                                </h4>
                                <p class='text-secondary mt-2'>{{cut_post($pn['data']['content'])}}</p>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
            <div class='d-flex align-items-center justify-content-center'>
                <a href='/posts' class='btn btn-success rounded-pill'>Artikel Lainnya</a>
            </div>
        </div>
    </div>
@endif

@include('layout.foot')