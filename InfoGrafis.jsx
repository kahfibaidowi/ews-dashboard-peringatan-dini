import { Layout } from "@/Components/layout"
import { api } from "@/Config/api"
import update from "immutability-helper"
import axios from "axios"
import React, { useEffect, useState } from "react"
import MapWindy from "@/Components/Modules/map_windy"
import { BASE_URL, isUndefined } from "@/Config/config"
import { Head } from "@inertiajs/react"
import { toast, ToastContainer } from "react-toastify"
import { FiChevronDown, FiCloudRain, FiHome, FiMenu, FiWind } from "react-icons/fi"
import * as turf from '@turf/turf'
import { arrayMonths, ceil, centroid, numFix } from "@/Config/helpers"
import { Collapse, Modal, Offcanvas } from "react-bootstrap"
import classNames from "classnames"
import CreatableSelect from "react-select/creatable"
import NumberFormat from "react-number-format"
import DataGrid from "react-data-grid"
import * as _ from "underscore"
import { ToastApp } from "@/Components/toast"



class Frontpage extends React.Component{
    state={
        tahun:"",
        data_kecamatan:[],
        data_kabupaten:[]
    }

    componentDidMount=()=>{
        const tahun=(new Date()).getFullYear()

        this.setState({
            tahun:tahun
        }, ()=>{
            this.fetchSummarySifatHujanKabupatenKota()
        })
    }
    
    //REQUEST, QUERY, MUTATION
    abortController=new AbortController()
    request={
        apiGetSummarySifatHujanKabupatenKota:async(tahun)=>{
            this.abortController.abort()
            this.abortController=new AbortController()

            return await api().get("/frontpage/summary/type/sifat_hujan_kabupaten_kota", {
                params:{
                    tahun:tahun
                },
                signal:this.abortController.signal
            })
            .then(res=>res.data)
        }
    }
    //--data
    fetchSummarySifatHujanKabupatenKota=async()=>{
        const {tahun}=this.state

        this.resetSifatHujan()
        await this.request.apiGetSummarySifatHujanKabupatenKota(tahun)
        .then(data=>{
            //all kecamatan
            let data_kecamatan=[]
            let data_kabupaten=[]

            //MAP
            data.data.map(d=>{
                let kecamatan=[]

                d.kecamatan.map(k=>{
                    let curah_hujan=[]
                    this.months_year().map(month=>{
                        for(var i=1; i<=3; i++){
                            const find_curah_hujan=k.curah_hujan.find(f=>f.bulan.toString()==month.toString() && f.input_ke.toString()==i.toString())
                            if(!isUndefined(find_curah_hujan)){
                                curah_hujan=curah_hujan.concat([find_curah_hujan])
                            }
                            else{
                                const data_curah_hujan={
                                    id_region:d.id_region,
                                    tahun:tahun,
                                    bulan:month,
                                    curah_hujan:"",
                                    curah_hujan_normal:"",
                                    sifat:""
                                }
                                curah_hujan=curah_hujan.concat([data_curah_hujan])
                            }
                        }
                    })
                    
                    data_kecamatan=data_kecamatan.concat([
                        Object.assign({}, k, {
                            curah_hujan:curah_hujan
                        })
                    ])
                    kecamatan=kecamatan.concat([
                        Object.assign({}, k, {
                            curah_hujan:curah_hujan
                        })
                    ])
                })

                data_kabupaten=data_kabupaten.concat([
                    Object.assign({}, d, {
                        kecamatan:kecamatan
                    })
                ])
            })
            
            this.setState({
                data_kecamatan:data_kecamatan,
                data_kabupaten:data_kabupaten
            })
        })
        .catch(err=>{
            if(err.name=="CanceledError"){
                toast.warn("Request Aborted!", {position:"bottom-center"})
            }
            else{
                toast.error("Gets Data Failed!", {position:"bottom-center"})
            }
        })
    }

    //VALUES
    months_year=()=>{
        let months=[]
        for(var i=1; i<=12; i++){
            months=months.concat([i])
        }

        return months
    }

    //HELPERS
    tahun_options=()=>{
        const year=(new Date()).getFullYear()

        let years=[]
        for(var i=year-2; i<=year+2; i++){
            years=years.concat([{value:i, label:i}])
        }

        return [{value:"", label:"Pilih Tahun"}].concat(years)
    }

    //ACTIONS
    typeTahun=e=>{
        this.setState({
            tahun:e.value
        }, ()=>{
            if(this.state.tahun.toString()!=""){
                this.fetchSummarySifatHujanKabupatenKota()
            }
        })
    }
    resetSifatHujan=()=>{
        this.setState({
            data_kecamatan:[],
            data_kabupaten:[]
        })
    }

    render(){
        const {tahun, data_kabupaten, data_kecamatan}=this.state

        return (
            <>
                <Head>
                    <title>Info Grafis</title>
                </Head>
                
                <Layout {...this.props}>
                    <div id="content-section" className='d-block' style={{marginTop:"80px", marginBottom:"80px"}}>
                        <div className='container'>
                            <div class="d-flex justify-content-between align-items-center flex-wrap grid-margin">
                                <div>
                                    <h4 class="mb-3 mb-md-0 fw-bold">Infografis</h4>
                                </div>
                                <div class="d-flex align-items-center flex-wrap text-nowrap">
                                    <div style={{minWidth:"150px"}}>
                                        <CreatableSelect
                                            options={this.tahun_options()}
                                            onChange={e=>this.typeTahun(e)}
                                            value={this.tahun_options().find(f=>f.value==tahun)}
                                            placeholder="Pilih Tahun"
                                            styles={{
                                                container:(baseStyles, state)=>({
                                                    ...baseStyles,
                                                    zIndex:998
                                                })
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <ControlBox data={this.state}/>

                            <Table data={this.state}/>
                        </div>
                    </div>
                </Layout>
                
                <ToastApp/>
            </>
        )
    }
}

/* CONTROL BOX */
const ControlBox=({data})=>{
    const [data_banjir, setDataBanjir]=useState(0)
    const [data_kekeringan, setDataKekeringan]=useState(0)

    useEffect(()=>{
        let banjir=[]
        let kekeringan=[]
        data.data_kecamatan.map(k=>{
            let count_rawan_banjir=0
            let count_rawan_kekeringan=0

            for(var i=0; i<36; i++){
                const ch_i=numFix(k.curah_hujan[i].curah_hujan)

                //banjir
                if(valueBanjir(ch_i)=="Rawan"){
                    count_rawan_banjir++
                }
                
                //kekeringan
                if(valueKekeringan(ch_i)=="Rawan"){
                    count_rawan_kekeringan++
                }

                //break
                if(count_rawan_banjir>0 && count_rawan_kekeringan>0){
                    break
                }
            }

            //store kecamatan
            if(count_rawan_banjir>0){
                banjir=banjir.concat([k])
            }
            if(count_rawan_kekeringan>0){
                kekeringan=kekeringan.concat([k])
            }
        })

        setDataBanjir(banjir)
        setDataKekeringan(kekeringan)

    }, [data])

    //values
    const valueKekeringan=(str_value)=>{
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<60){
            return "Rawan"
        }
        else if(value>=60 && value<75){
            return "Waspada"
        }
        else if(value>=75){
            return "Aman"
        }

        return ""
    }
    const valueBanjir=(str_value)=>{
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<=150){
            return "Aman"
        }
        else if(value>150 && value<=200){
            return "Waspada"
        }
        else if(value>200){
            return "Rawan"
        }
    }


    return (
            <div className='row mt-4'>
                <div className="col-md-4 grid-margin stretch-card">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-baseline">
                                <h6 className="card-title mb-1">Total Kecamatan</h6>
                            </div>
                            <div className="row">
                                <div className="col-6 col-md-12 col-xl-5">
                                    <h3 className="mb-1" style={{fontWeight:"700"}}>
                                        <NumberFormat
                                            displayType="text"
                                            thousandSeparator
                                            value={data.data_kecamatan.length}
                                        />
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4 grid-margin stretch-card">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-baseline">
                                <h6 className="card-title mb-1">Total Kecamatan Rawan Banjir</h6>
                            </div>
                            <div className="row">
                                <div className="col-6 col-md-12 col-xl-5">
                                    <h3 className="mb-1" style={{fontWeight:"700"}}>
                                        <NumberFormat
                                            displayType="text"
                                            thousandSeparator
                                            value={data_banjir.length}
                                        />
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4 grid-margin stretch-card">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-baseline">
                                <h6 className="card-title mb-1">Total Kecamatan Rawan Kekeringan</h6>
                            </div>
                            <div className="row">
                                <div className="col-6 col-md-12 col-xl-5">
                                    <h3 className="mb-1" style={{fontWeight:"700"}}>
                                        <NumberFormat
                                            displayType="text"
                                            thousandSeparator
                                            value={data_kekeringan.length}
                                        />
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    )
}

/* TABLE */
const Table=({data})=>{
    const [active_tab, setActiveTab]=useState("kecamatan_rawan_banjir")
    const tabs=[
        {label:"Kecamatan Rawan Banjir", value:"kecamatan_rawan_banjir"},
        {label:"Kecamatan Rawan Kekeringan", value:"kecamatan_rawan_kekeringan"},
        {label:"Kabupaten/Kota Rawan Banjir", value:"kabkota_rawan_banjir"},
        {label:"Kabupaten/kota Rawan Kekeringan", value:"kabkota_rawan_kekeringan"}
    ]

    return (
        <div className="row mb-4">
            <div className="col-12">
                <div className="card">
                    <div className="card-header">
                        <ul class="nav nav-tabs card-header-tabs">
                            {tabs.map(t=>(
                                <li className="nav-item">
                                    <a 
                                        className={classNames("nav-link", {"active":t.value==active_tab})}
                                        href="#"
                                        onClick={e=>{
                                            e.preventDefault()
                                            setActiveTab(t.value)
                                        }}
                                    >
                                        {t.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="card-body">
                        {active_tab=="kecamatan_rawan_banjir"&&
                            <TableKecamatanRawanBanjir data={data.data_kecamatan}/>
                        }
                        {active_tab=="kecamatan_rawan_kekeringan"&&
                            <TableKecamatanRawanKekeringan data={data.data_kecamatan}/>
                        }
                        {active_tab=="kabkota_rawan_banjir"&&
                            <TableKabupatenKotaRawanBanjir data={data.data_kabupaten}/>
                        }
                        {active_tab=="kabkota_rawan_kekeringan"&&
                            <TableKabupatenKotaRawanKekeringan data={data.data_kabupaten}/>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

const TableKecamatanRawanBanjir=({data})=>{
    const [detail, setDetail]=useState({
        is_open:false,
        data:[]
    })

    const data_kecamatan=()=>{
        const kecamatan=data.map((k, idx)=>{
            let count_rawan=0
            let list_rawan=[]

            for(var i=0; i<36; i++){
                const ch_i=numFix(k.curah_hujan[i].curah_hujan)
                const ch_normal=numFix(k.curah_hujan[i].curah_hujan_normal)

                if(valueBanjir(ch_i)=="Rawan"){
                    count_rawan++
                    list_rawan=list_rawan.concat([Object.assign({}, k.curah_hujan[i], {
                        curah_hujan:ch_i,
                        curah_hujan_normal:ch_normal
                    })])
                }
            }

            return Object.assign({}, k, {
                total_rawan:count_rawan,
                list_rawan:list_rawan,
                row_type:"list",
                curah_hujan:undefined
            })
        })

        return _.sortBy(kecamatan, "total_rawan").reverse().map((k, idx)=>{
            return Object.assign({}, k, {
                index:idx
            })
        })
    }

    //values
    const valueBanjir=(str_value)=>{
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<=150){
            return "Aman"
        }
        else if(value>150 && value<=200){
            return "Waspada"
        }
        else if(value>200){
            return "Rawan"
        }
    }

    //column
    const columns=[
        {
            key:'no',
            name:'#',
            width: 50,
            formatter:({row})=>{
                return <span>{row.index+1}</span>
            }
        },
        {
            key:'provinsi',
            name:'Provinsi',
            width: 170,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.parent.parent.region}</span>
            }
        },
        {
            key:'kabkota',
            name:'Kabupaten/Kota',
            width: 200,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.parent.region}</span>
            }
        },
        {
            key:'kecamatan',
            name:'Kecamatan',
            width: 250,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.region}</span>
            }
        },
        {
            key:'jml_rawan',
            name:'Jumlah Rawan',
            width: 130,
            resizable:true,
            formatter:({row})=>{
                return <span>
                    {row.total_rawan==0?
                        "-"
                    :
                        <>{row.total_rawan} Data</>
                    }
                </span>
            }
        },
        {
            key:'act',
            name:'',
            width: 120,
            resizable:true,
            formatter:({row})=>{
                return (
                    <div className="d-grid gap-2 h-100 px-0" style={{width:"100%"}}>
                        <button 
                            className="d-flex align-items-center justify-content-center btn p-0 btn-light rounded-0"
                            type="button"onClick={ev=>toggleDetail(true, row.list_rawan)}
                        >
                            Detail
                        </button>
                    </div>
                )
            }
        },
    ]

    //actions
    const toggleDetail=(show=false, data=[])=>{
        setDetail({
            is_open:show,
            data:data
        })
    }

    return (
        <>
            <div className="d-block" style={{height:"500px"}}>
                <DataGrid
                    rows={data_kecamatan()}
                    columns={columns}
                    className={classNames("rdg-light","fill-grid")}
                    rowHeight={25}
                    headerRowHeight={40}
                    style={{height:"100%"}}
                    renderers
                />
            </div>

            <Modal show={detail.is_open} backdrop="static" onHide={()=>toggleDetail()} scrollable>
                <Modal.Header closeButton>
                    <h4 className="modal-title">Bulan Rawan Banjir</h4>
                </Modal.Header>
                <Modal.Body>
                    <div className="table-responsive mt-3">
                        <table className="table table-hover table-hover table-custom table-wrap mb-0">
                            <thead className="thead-light">
                                <tr>
                                    <th className="" width="50">#</th>
                                    <th className="">Bulan</th>
                                    <th className="">Curah Hujan</th>
                                    <th className="">CH Normal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.data.map((list, idx)=>(
                                    <tr>
                                        <td>{idx+1}</td>
                                        <td>{arrayMonths[list.bulan-1]} {list.input_ke}</td>
                                        <td>{list.curah_hujan}</td>
                                        <td>{list.curah_hujan_normal}</td>
                                    </tr>
                                ))}
                                {detail.data.length==0&&
                                    <tr>
                                        <td colSpan={4} className="text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                Data tidak ditemukan!
                                            </div>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
                <Modal.Footer className="mt-3 border-top pt-2">
                    <button 
                        type="button" 
                        className="btn btn-link text-gray me-auto" 
                        onClick={e=>toggleDetail()}
                    >
                        Tutup
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

const TableKecamatanRawanKekeringan=({data})=>{
    const [detail, setDetail]=useState({
        is_open:false,
        data:[]
    })

    const data_kecamatan=()=>{
        const kecamatan=data.map((k, idx)=>{
            let count_rawan=0
            let list_rawan=[]

            for(var i=0; i<36; i++){
                const ch_i=numFix(k.curah_hujan[i].curah_hujan)
                const ch_normal=numFix(k.curah_hujan[i].curah_hujan_normal)

                if(valueKekeringan(ch_i)=="Rawan"){
                    count_rawan++
                    list_rawan=list_rawan.concat([Object.assign({}, k.curah_hujan[i], {
                        curah_hujan:ch_i,
                        curah_hujan_normal:ch_normal
                    })])
                }
            }

            return Object.assign({}, k, {
                total_rawan:count_rawan,
                list_rawan:list_rawan,
                row_type:"list",
                curah_hujan:undefined
            })
        })

        return _.sortBy(kecamatan, "total_rawan").reverse().map((k, idx)=>{
            return Object.assign({}, k, {
                index:idx
            })
        })
    }

    //values
    const valueKekeringan=(str_value)=>{
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<60){
            return "Rawan"
        }
        else if(value>=60 && value<75){
            return "Waspada"
        }
        else if(value>=75){
            return "Aman"
        }

        return ""
    }

    //column
    const columns=[
        {
            key:'no',
            name:'#',
            width: 50,
            formatter:({row})=>{
                return <span>{row.index+1}</span>
            }
        },
        {
            key:'provinsi',
            name:'Provinsi',
            width: 170,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.parent.parent.region}</span>
            }
        },
        {
            key:'kabkota',
            name:'Kabupaten/Kota',
            width: 200,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.parent.region}</span>
            }
        },
        {
            key:'kecamatan',
            name:'Kecamatan',
            width: 250,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.region}</span>
            }
        },
        {
            key:'jml_rawan',
            name:'Jumlah Rawan',
            width: 130,
            resizable:true,
            formatter:({row})=>{
                return <span>
                    {row.total_rawan==0?
                        "-"
                    :
                        <>{row.total_rawan} Data</>
                    }
                </span>
            }
        },
        {
            key:'act',
            name:'',
            width: 120,
            resizable:true,
            formatter:({row})=>{
                return (
                    <div className="d-grid gap-2 h-100 px-0" style={{width:"100%"}}>
                        <button 
                            className="d-flex align-items-center justify-content-center btn p-0 btn-light rounded-0"
                            type="button"onClick={ev=>toggleDetail(true, row.list_rawan)}
                        >
                            Detail
                        </button>
                    </div>
                )
            }
        },
    ]

    //actions
    const toggleDetail=(show=false, data=[])=>{
        setDetail({
            is_open:show,
            data:data
        })
    }

    return (
        <>
            <div className="d-block" style={{height:"500px"}}>
                <DataGrid
                    rows={data_kecamatan()}
                    columns={columns}
                    className={classNames("rdg-light","fill-grid")}
                    rowHeight={25}
                    headerRowHeight={40}
                    style={{height:"100%"}}
                    renderers
                />
            </div>

            <Modal show={detail.is_open} backdrop="static" onHide={()=>toggleDetail()} scrollable>
                <Modal.Header closeButton>
                    <h4 className="modal-title">Bulan Rawan Kekeringan</h4>
                </Modal.Header>
                <Modal.Body>
                    <div className="table-responsive mt-3">
                        <table className="table table-hover table-hover table-custom table-wrap mb-0">
                            <thead className="thead-light">
                                <tr>
                                    <th className="" width="50">#</th>
                                    <th className="">Bulan</th>
                                    <th className="">Curah Hujan</th>
                                    <th className="">CH Normal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.data.map((list, idx)=>(
                                    <tr>
                                        <td>{idx+1}</td>
                                        <td>{arrayMonths[list.bulan-1]} {list.input_ke}</td>
                                        <td>{list.curah_hujan}</td>
                                        <td>{list.curah_hujan_normal}</td>
                                    </tr>
                                ))}
                                {detail.data.length==0&&
                                    <tr>
                                        <td colSpan={4} className="text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                Data tidak ditemukan!
                                            </div>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
                <Modal.Footer className="mt-3 border-top pt-2">
                    <button 
                        type="button" 
                        className="btn btn-link text-gray me-auto" 
                        onClick={e=>toggleDetail()}
                    >
                        Tutup
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

const TableKabupatenKotaRawanBanjir=({data})=>{
    const [detail, setDetail]=useState({
        is_open:false,
        data:[]
    })

    const data_kecamatan=()=>{
        const kabupaten_kota=data.map((d, idx)=>{
            let count_rawan=0
            let list_rawan=[]
            let ch_kecamatan=valueKabupatenKotaCurahHujan(d)

            for(var i=0; i<36; i++){
                const ch_i=numFix(ch_kecamatan[i].curah_hujan)
                const ch_normal=numFix(ch_kecamatan[i].curah_hujan_normal)
                
                if(valueBanjir(ch_i)=="Rawan"){
                    count_rawan++
                    list_rawan=list_rawan.concat([Object.assign({}, ch_kecamatan[i], {
                        curah_hujan:ch_i,
                        curah_hujan_normal:ch_normal
                    })])
                }
            }

            return Object.assign({}, d, {
                total_rawan:count_rawan,
                list_rawan:list_rawan,
                row_type:"list",
                curah_hujan:undefined
            })
        })

        return _.sortBy(kabupaten_kota, "total_rawan").reverse().map((k, idx)=>{
            return Object.assign({}, k, {
                index:idx
            })
        })
    }

    //values
    const valueBanjir=(str_value)=>{
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<=150){
            return "Aman"
        }
        else if(value>150 && value<=200){
            return "Waspada"
        }
        else if(value>200){
            return "Rawan"
        }
    }
    const valueKabupatenKotaCurahHujanColumn=(data_kabkota, idx_column)=>{
        let curah_hujan=[]

        data_kabkota.kecamatan.map(kec=>{
            if(!isUndefined(kec.curah_hujan[idx_column].id_curah_hujan)){
                curah_hujan=curah_hujan.concat([kec.curah_hujan[idx_column]])
            }
        })

        return curah_hujan
    }
    const valueKabupatenKotaCurahHujan=(data_kabkota)=>{
        let curah_hujan=[]

        for(var i=1; i<=12; i++){
            for(var j=1; j<=3; j++){
                const ch_kabupaten_kota_column=valueKabupatenKotaCurahHujanColumn(data_kabkota, (i-1)*3+(j-1))

                if(ch_kabupaten_kota_column.length>0){
                    const ch=ch_kabupaten_kota_column.reduce((carry, item)=>{
                        return Number(carry)+Number(item.curah_hujan)
                    }, 0)
                    const ch_normal=ch_kabupaten_kota_column.reduce((carry, item)=>{
                        return Number(carry)+Number(item.curah_hujan_normal)
                    }, 0)

                    curah_hujan=curah_hujan.concat([{
                        curah_hujan:ch/ch_kabupaten_kota_column.length,
                        curah_hujan_normal:ch_normal/ch_kabupaten_kota_column.length,
                        bulan:i,
                        input_ke:j
                    }])
                }
                else{
                    curah_hujan=curah_hujan.concat([{
                        curah_hujan:"",
                        curah_hujan_normal:"",
                        bulan:i,
                        input_ke:j
                    }])
                }
            }
        }

        return curah_hujan
    }

    //column
    const columns=[
        {
            key:'no',
            name:'#',
            width: 50,
            formatter:({row})=>{
                return <span>{row.index+1}</span>
            }
        },
        {
            key:'provinsi',
            name:'Provinsi',
            width: 170,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.parent.region}</span>
            }
        },
        {
            key:'kabkota',
            name:'Kabupaten/Kota',
            width: 250,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.region}</span>
            }
        },
        {
            key:'jml_rawan',
            name:'Jumlah Rawan',
            width: 130,
            resizable:true,
            formatter:({row})=>{
                return <span>
                    {row.total_rawan==0?
                        "-"
                    :
                        <>{row.total_rawan} Data</>
                    }
                </span>
            }
        },
        {
            key:'act',
            name:'',
            width: 120,
            resizable:true,
            formatter:({row})=>{
                return (
                    <div className="d-grid gap-2 h-100 px-0" style={{width:"100%"}}>
                        <button 
                            className="d-flex align-items-center justify-content-center btn p-0 btn-light rounded-0"
                            type="button"onClick={ev=>toggleDetail(true, row.list_rawan)}
                        >
                            Detail
                        </button>
                    </div>
                )
            }
        },
    ]

    //actions
    const toggleDetail=(show=false, data=[])=>{
        setDetail({
            is_open:show,
            data:data
        })
    }

    return (
        <>
            <div className="d-block" style={{height:"500px"}}>
                <DataGrid
                    rows={data_kecamatan()}
                    columns={columns}
                    className={classNames("rdg-light","fill-grid")}
                    rowHeight={25}
                    headerRowHeight={40}
                    style={{height:"100%"}}
                    renderers
                />
            </div>

            <Modal show={detail.is_open} backdrop="static" onHide={()=>toggleDetail()} scrollable>
                <Modal.Header closeButton>
                    <h4 className="modal-title">Bulan Rawan Banjir</h4>
                </Modal.Header>
                <Modal.Body>
                    <div className="table-responsive mt-3">
                        <table className="table table-hover table-hover table-custom table-wrap mb-0">
                            <thead className="thead-light">
                                <tr>
                                    <th className="" width="50">#</th>
                                    <th className="">Bulan</th>
                                    <th className="">Curah Hujan</th>
                                    <th className="">CH Normal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.data.map((list, idx)=>(
                                    <tr>
                                        <td>{idx+1}</td>
                                        <td>{arrayMonths[list.bulan-1]} {list.input_ke}</td>
                                        <td>{list.curah_hujan}</td>
                                        <td>{list.curah_hujan_normal}</td>
                                    </tr>
                                ))}
                                {detail.data.length==0&&
                                    <tr>
                                        <td colSpan={4} className="text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                Data tidak ditemukan!
                                            </div>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
                <Modal.Footer className="mt-3 border-top pt-2">
                    <button 
                        type="button" 
                        className="btn btn-link text-gray me-auto" 
                        onClick={e=>toggleDetail()}
                    >
                        Tutup
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

const TableKabupatenKotaRawanKekeringan=({data})=>{
    const [detail, setDetail]=useState({
        is_open:false,
        data:[]
    })

    const data_kecamatan=()=>{
        const kabupaten_kota=data.map((d, idx)=>{
            let count_rawan=0
            let list_rawan=[]
            let ch_kecamatan=valueKabupatenKotaCurahHujan(d)

            for(var i=0; i<36; i++){
                const ch_i=numFix(ch_kecamatan[i].curah_hujan)
                const ch_normal=numFix(ch_kecamatan[i].curah_hujan_normal)
                
                if(valueKekeringan(ch_i)=="Rawan"){
                    count_rawan++
                    list_rawan=list_rawan.concat([Object.assign({}, ch_kecamatan[i], {
                        curah_hujan:ch_i,
                        curah_hujan_normal:ch_normal
                    })])
                }
            }

            return Object.assign({}, d, {
                total_rawan:count_rawan,
                list_rawan:list_rawan,
                row_type:"list",
                curah_hujan:undefined
            })
        })

        return _.sortBy(kabupaten_kota, "total_rawan").reverse().map((k, idx)=>{
            return Object.assign({}, k, {
                index:idx
            })
        })
    }

    //values
    const valueKekeringan=(str_value)=>{
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<60){
            return "Rawan"
        }
        else if(value>=60 && value<75){
            return "Waspada"
        }
        else if(value>=75){
            return "Aman"
        }

        return ""
    }
    const valueKabupatenKotaCurahHujanColumn=(data_kabkota, idx_column)=>{
        let curah_hujan=[]

        data_kabkota.kecamatan.map(kec=>{
            if(!isUndefined(kec.curah_hujan[idx_column].id_curah_hujan)){
                curah_hujan=curah_hujan.concat([kec.curah_hujan[idx_column]])
            }
        })

        return curah_hujan
    }
    const valueKabupatenKotaCurahHujan=(data_kabkota)=>{
        let curah_hujan=[]

        for(var i=1; i<=12; i++){
            for(var j=1; j<=3; j++){
                const ch_kabupaten_kota_column=valueKabupatenKotaCurahHujanColumn(data_kabkota, (i-1)*3+(j-1))

                if(ch_kabupaten_kota_column.length>0){
                    const ch=ch_kabupaten_kota_column.reduce((carry, item)=>{
                        return Number(carry)+Number(item.curah_hujan)
                    }, 0)
                    const ch_normal=ch_kabupaten_kota_column.reduce((carry, item)=>{
                        return Number(carry)+Number(item.curah_hujan_normal)
                    }, 0)

                    curah_hujan=curah_hujan.concat([{
                        curah_hujan:ch/ch_kabupaten_kota_column.length,
                        curah_hujan_normal:ch_normal/ch_kabupaten_kota_column.length,
                        bulan:i,
                        input_ke:j
                    }])
                }
                else{
                    curah_hujan=curah_hujan.concat([{
                        curah_hujan:"",
                        curah_hujan_normal:"",
                        bulan:i,
                        input_ke:j
                    }])
                }
            }
        }

        return curah_hujan
    }

    //column
    const columns=[
        {
            key:'no',
            name:'#',
            width: 50,
            formatter:({row})=>{
                return <span>{row.index+1}</span>
            }
        },
        {
            key:'provinsi',
            name:'Provinsi',
            width: 170,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.parent.region}</span>
            }
        },
        {
            key:'kabkota',
            name:'Kabupaten/Kota',
            width: 250,
            resizable:true,
            formatter:({row})=>{
                return <span>{row.region}</span>
            }
        },
        {
            key:'jml_rawan',
            name:'Jumlah Rawan',
            width: 130,
            resizable:true,
            formatter:({row})=>{
                return <span>
                    {row.total_rawan==0?
                        "-"
                    :
                        <>{row.total_rawan} Data</>
                    }
                </span>
            }
        },
        {
            key:'act',
            name:'',
            width: 120,
            resizable:true,
            formatter:({row})=>{
                return (
                    <div className="d-grid gap-2 h-100 px-0" style={{width:"100%"}}>
                        <button 
                            className="d-flex align-items-center justify-content-center btn p-0 btn-light rounded-0"
                            type="button"onClick={ev=>toggleDetail(true, row.list_rawan)}
                        >
                            Detail
                        </button>
                    </div>
                )
            }
        },
    ]

    //actions
    const toggleDetail=(show=false, data=[])=>{
        setDetail({
            is_open:show,
            data:data
        })
    }

    return (
        <>
            <div className="d-block" style={{height:"500px"}}>
                <DataGrid
                    rows={data_kecamatan()}
                    columns={columns}
                    className={classNames("rdg-light","fill-grid")}
                    rowHeight={25}
                    headerRowHeight={40}
                    style={{height:"100%"}}
                    renderers
                />
            </div>

            <Modal show={detail.is_open} backdrop="static" onHide={()=>toggleDetail()} scrollable>
                <Modal.Header closeButton>
                    <h4 className="modal-title">Bulan Rawan Kekeringan</h4>
                </Modal.Header>
                <Modal.Body>
                    <div className="table-responsive mt-3">
                        <table className="table table-hover table-hover table-custom table-wrap mb-0">
                            <thead className="thead-light">
                                <tr>
                                    <th className="" width="50">#</th>
                                    <th className="">Bulan</th>
                                    <th className="">Curah Hujan</th>
                                    <th className="">CH Normal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.data.map((list, idx)=>(
                                    <tr>
                                        <td>{idx+1}</td>
                                        <td>{arrayMonths[list.bulan-1]} {list.input_ke}</td>
                                        <td>{list.curah_hujan}</td>
                                        <td>{list.curah_hujan_normal}</td>
                                    </tr>
                                ))}
                                {detail.data.length==0&&
                                    <tr>
                                        <td colSpan={4} className="text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                Data tidak ditemukan!
                                            </div>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
                <Modal.Footer className="mt-3 border-top pt-2">
                    <button 
                        type="button" 
                        className="btn btn-link text-gray me-auto" 
                        onClick={e=>toggleDetail()}
                    >
                        Tutup
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    )
}


export default Frontpage